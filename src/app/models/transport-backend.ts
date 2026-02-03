import { Observable } from "rxjs";

export interface Stop {
    id: string;
    name: string;
    pinned?: boolean;
    walkingTime?: number;
    hideUnreachable?: boolean;
}

export interface Departure {
    line: string;
    direction: string;
    time: string;
    realtime: boolean;
    timestamp: number;
    delayed: boolean;
}

export interface TransportBackend {
    name: string;
    label: string;
    searchStops(query: string): Observable<Stop[]>;
    getStopInfo(stopId: string): Observable<Stop | undefined>;
    getDepartures(stopId: string, minOffset: number): Observable<Departure[]>;
}