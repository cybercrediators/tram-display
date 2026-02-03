import { HttpClient } from "@angular/common/http";
import { Departure, Stop, TransportBackend } from "../transport-backend";
import { Observable } from "rxjs";

export class EfaBackend  implements TransportBackend {
    name = 'efa';
    label = 'EFA';

    constructor(private http: HttpClient) { }

    searchStops(query: string): Observable<Stop[]> {
        return null as any;        
    }

    getStopInfo(stopId: string): Observable<Stop | undefined> {
        return null as any;        
    }

    getDepartures(stopId: string, minOffset: number): Observable<Departure[]> {
        return null as any;
    }
}