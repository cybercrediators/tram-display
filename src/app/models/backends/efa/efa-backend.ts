import { HttpClient } from "@angular/common/http";
import { Departure, Stop, TransportBackend } from "../../transport-backend";
import { BehaviorSubject, Observable, map, min, of } from "rxjs";
import { AVV_CONFIG, EfaConfig } from "./efa-config";

export class EfaBackend  implements TransportBackend {
    name = 'efa';
    label = 'EFA';

    // since EFA covers basically everything, add possibility for multiple configs
    private configs: EfaConfig[] = [AVV_CONFIG];
    private configSource = new BehaviorSubject<EfaConfig>(AVV_CONFIG);
    config$ = this.configSource.asObservable();

    constructor(private http: HttpClient) {
        const storedConfigs = localStorage.getItem('tram-display-efa-config');        

        if (storedConfigs) {
            try {
                const parsedConfigs = JSON.parse(storedConfigs);
                if (Array.isArray(parsedConfigs)) {
                    parsedConfigs.forEach(pc => {
                        if (pc.id === AVV_CONFIG.id) return; // skip duplicates
                        this.configs.push(pc);
                    });
                }
            } catch (e) { console.error('Failed to parse stored EFA configs', e); }
        }

        const activeId = localStorage.getItem('tram-display-efa-active-id');
        if (activeId) {
            const activeConfig = this.configs.find(c => c.id === activeId);
            if (activeConfig) {
                this.configSource.next(activeConfig);
                this.updateLabel(activeConfig);
            } else {
                this.updateLabel(AVV_CONFIG);
            }
        }
    }

    getConfigs(): EfaConfig[] {
        return this.configs;
    }
    
    getCurrentConfig(): EfaConfig {
        return this.configSource.value;
    }
    
    addConfig(config: EfaConfig) {
        this.configs.push(config);
        this.saveConfigs();
    }

    removeConfig(configId: string) {
        if (configId === 'efa-avv') return; // do not remove default config
        this.configs = this.configs.filter(c => c.id !== configId);

        this.saveConfigs();

        if (this.configSource.value.id === configId) {
            this.setConfig(AVV_CONFIG);
        }
    }

    updateConfig(config: EfaConfig) {
        const index = this.configs.findIndex(c => c.id === config.id);
        if (index !== -1) {
            this.configs[index] = config;
            this.saveConfigs();

            if (this.configSource.value.id === config.id) {
                this.configSource.next(config);
                this.updateLabel(config);
            }
        }
    }

    setConfig(config: EfaConfig) {
        const existingConfig = this.configs.find(c => c.id === config.id);
        if (existingConfig) {
            this.configSource.next(existingConfig);
            this.updateLabel(existingConfig);

            localStorage.setItem('tram-display-efa-active-id', existingConfig.id);

            Object.assign(existingConfig, config);
            this.saveConfigs();
        } else {
            this.configs.push(config);
            this.saveConfigs();
            this.configSource.next(config);
            this.updateLabel(config);

            localStorage.setItem('tram-display-efa-active-id', config.id);
        }
    }

    private saveConfigs() {
        localStorage.setItem('tram-display-efa-config', JSON.stringify(this.configs));
    }

    private updateLabel(config: EfaConfig) {
        this.label = config.name;
    }

    private getStopPoints(query: string, params: {}): Observable<any[]> {
        if (!query) return of([]);
        const config = this.getCurrentConfig();
        return this.http.get<any>(`${config.baseUrl}/XML_STOPFINDER_REQUEST`, {
            ...params,
        }).pipe(
            map(response => {
                if (!response.stopFinder || !response.stopFinder.points) return [];
                let points = response.stopFinder.points;
                if (!Array.isArray(points)) {
                    if (points.point) {
                        points = Array.isArray(points.point) ? points.point : [points.point];
                    } else {
                        points = [points];
                    }
                }
                return points;
            })
        );
    }

    naiveSearchGID(query: string): Observable<any[]> {
        return this.getStopPoints(query, {
            params: {
                outputFormat: 'JSON',
                type_sf: 'any',
                name_sf: query,
                anyObjFilter_sf: '2',
                limit: '50'
            }
        }).pipe(
            map(points => {
                return points.map((point: any) => ({
                    id: point.stateless || point.ref.id,
                    name: point.name,
                    gid: point.ref?.gid || point.gid,
                    city: point.ref?.place || point.place
                }));
            })
        );
    }

    searchStops(query: string): Observable<Stop[]> {
        if (!query) return of([]);
        const config = this.getCurrentConfig();
        return this.getStopPoints(query, {
            params: {
                outputFormat: 'JSON',
                type_sf: 'any',
                name_sf: query,
                anyObjFilter_sf: '2',
                limit: '50'
            }
        }).pipe(
            map(points => {
                return points
                    .filter((points: any) => {
                        if (config.regionCodes.length === 0) return true;

                        const gid = points.ref?.gid || points.gid;
                        if (!gid) return false;

                        return config.regionCodes.some(rc => gid.startsWith(rc));
                    })
                    .map((point: any) => ({
                        id: point.stateless || point.ref.id,
                        name: point.name
                    })).filter((stop: Stop) => stop.id && stop.name);
            })
        );
    }

    getStopInfo(stopId: string): Observable<Stop | undefined> {
        const config = this.getCurrentConfig();
        return this.getStopPoints('', {
            params: {
                outputFormat: 'JSON',
                type_sf: 'any',
                name_sf: stopId,
                anyObjFilter_sf: '2',
                limit: '50'
            }
        }).pipe(
            map(points => {
                const match = points.find((point: any) => (point.stateless || point.ref.id) === stopId);
                if (match) {
                    return {
                        id: match.stateless || match.ref.id,
                        name: match.name || match.ref.name
                    };
                }
                return undefined;
            })
        );
    }

    getDepartures(stopId: string, minOffset: number): Observable<Departure[]> {
        const config = this.getCurrentConfig();
        const params: any = {
            outputFormat: 'JSON',
            type_dm: 'stop',
            name_dm: stopId,
            mode: 'direct',
            limit: '12',
            useRealtime: '1'
        };

        if (config.excludeTrains) {
            params.excludeMeans = 'checkbox';
            params.exclMOT_0 = '1'; // exclude trains
        }

        if (minOffset > 0) {
            const future = new Date(Date.now() + minOffset * 60000);
            const yyyy = future.getFullYear();
            const mm = String(future.getMonth() + 1).padStart(2, '0');
            const dd = String(future.getDate()).padStart(2, '0');
            const hh = String(future.getHours()).padStart(2, '0');
            const min = String(future.getMinutes()).padStart(2, '0');
            
            params.itdDate = `${yyyy}${mm}${dd}`;
            params.itdTime = `${hh}:${min}`;
        }

        return this.http.get<any>(`${config.baseUrl}/XML_DM_REQUEST`, { params }).pipe(
            map(response => {
                if (!response.departureList) return [];
                let departures = response.departureList.departure || response.departureList;
                if (!departures) return [];
                if (!Array.isArray(departures)) departures = [departures];

                return departures.map((dep: any) => {
                    let timeDisplay = '';
                    let timestamp = 0;
                    let delayed = false;

                    let plannedTs = 0;                    
                    let realTs = 0;

                    if (dep.dateTime) {
                        plannedTs = this.parseEfaDate(dep.dateTime);
                    }
                    if (dep.realDateTime) {
                        realTs = this.parseEfaDate(dep.realDateTime);
                    }
                    
                    if(realTs > 0) {
                        timestamp = realTs;
                        if (plannedTs > 0 && (realTs - plannedTs) >= 120000) { // delay of 2 minutes is delayed (take that DB!)
                            delayed = true;
                        }
                    } else if (plannedTs > 0) {
                        timestamp = plannedTs;
                    } else {
                        timestamp = Date.now() + (parseInt(dep.countdown || '0') * 60000);
                    }

                    const lineName = dep.servingLine?.number || dep.servingLine?.symbol || dep.servingLine?.name || dep.line || '?';

                    if (dep.countdown && dep.countdown !== "") {
                        timeDisplay = dep.countdown + ' min';
                    } else if (dep.dateTime && dep.dateTime.minute.toString().padStart(2, '0')) {
                        const min = dep.dateTime.minute.toString().padStart(2, '0');
                        timeDisplay = `${dep.dateTime.hour}:${min}`;
                    }

                    return {
                        line: lineName,
                        direction: dep.servingLine ? dep.servingLine.direction : dep.direction,
                        time: timeDisplay,
                        realtime: dep.realTimeTripStatus === 'MONITORED',
                        timestamp,
                        delayed
                    };
                })
                .filter((dep: any) => dep != null)
                .sort((a: Departure, b: Departure) => a.timestamp - b.timestamp);
            })
        );
    }

    private parseEfaDate(efaDate: any): number {
        if (!efaDate.year) return 0;
        return new Date(
            parseInt(efaDate.year),
            parseInt(efaDate.month) - 1,
            parseInt(efaDate.day),
            parseInt(efaDate.hour),
            parseInt(efaDate.minute)
        ).getTime();
    }
}