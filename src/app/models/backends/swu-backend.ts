import { Injectable } from '@angular/core';
import { TransportBackend, Stop, Departure } from "../transport-backend";
import { environment } from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable, of, map, delay } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SwuBackend  implements TransportBackend {
    name = 'swu';
    label = 'Ulm (SWU)';
    private readonly apiUrl = environment.swuApiUrl;

    private cachedStops: Stop[] | null = null;

    constructor(private http: HttpClient) { }

    searchStops(query: string): Observable<Stop[]> {
        if (!query || query.length < 2) return of([])
    
        if (this.cachedStops) {
            return of(this.filterStops(this.cachedStops, query));
        }

        // fetch stops from API if not already cached, use BaseData of a stop for SWU backend
        return this.http.get<any>(this.apiUrl + '/stop/attributes/BaseData').pipe(
            map(response => {
                if (!response.StopAttributes || !response.StopAttributes.StopData) return [];

                const stops = response.StopAttributes.StopData.map((s: any) => ({
                    id: s.StopNumber.toString(),
                    name: s.StopName
                }));

                this.cachedStops = stops;
                return this.filterStops(stops, query);
            })
        );       
    }

    private filterStops(stops: Stop[], query: string): Stop[] {
        return stops.filter(stop => stop.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
    }

    getStopInfo(stopId: string): Observable<Stop | undefined> {
         if (this.cachedStops) return of(this.cachedStops?.find(stop => stop.id === stopId));

         return this.http.get<any>(this.apiUrl + '/stop/attributes/BaseData').pipe(
            map(response => {
                if (!response.StopAttributes || !response.StopAttributes.StopData || !response.StopAttributes.StopData.length) return undefined;
                const stops = response.StopAttributes.StopData[0]
                return {
                    id: stops.StopNumber.toString(),
                    name: stops.StopName
                };
            })
        );
    }

    getDepartures(stopId: string, minOffset: number): Observable<Departure[]> {
        const params: any = {
            StopNumber: stopId,
            Limit: '50'
        };

        return this.http.get<any>(this.apiUrl + '/stop/passage/Departures', { params }).pipe(
            map(response => {
                if (!response.StopPassage || !response.StopPassage.DepartureData) return [];

                // SWU API does not support future departures based on time offset
                const now = Date.now();
                const minTimeArr = now + (minOffset * 60000);

                // console.log(response);
                
                return response.StopPassage.DepartureData.map((d: any) => {
                    const scheduledTime = new Date(d.DepartureTimeScheduled).getTime();
                    const actual = d.DepartureTimeActual ? new Date(d.DepartureTimeActual).getTime() : scheduledTime;

                    const delayMs = actual - scheduledTime;
                    const delayed = delayMs >= 120000; // consider delayed if delay is 2 minutes or more (yes, we're stricter than the DB)

                    const dateObj = new Date(actual);
                    const HH = dateObj.getHours().toString().padStart(2, '0');
                    const mm = dateObj.getMinutes().toString().padStart(2, '0');
                    const timeDisplay = `${HH}:${mm}`;

                    return {
                        line: d.RouteName,
                        direction: d.DepartureDirectionText,
                        time: timeDisplay,
                        timestamp: actual,
                        delayed: delayed
                    };
                })
                .filter((dep: Departure) => dep.timestamp >= minTimeArr)
                .sort((a: Departure, b: Departure) => a.timestamp - b.timestamp)
                .slice(0, 15);
            })
        );
    }
}