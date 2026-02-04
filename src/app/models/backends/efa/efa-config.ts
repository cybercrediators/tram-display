import { environment } from "../../../../environments/environment";

export interface EfaConfig {
    id: string;
    name: string;
    baseUrl: string;
    regionCodes: string[];
    excludeTrains?: boolean;
}

// set default efa config for AVV in the (supreme) city of Augsburg
export const AVV_CONFIG: EfaConfig = {
    id: 'efa-avv',
    name: 'Augsburg (AVV)',
    baseUrl: environment.efaAVVApiUrl,
    regionCodes: ['de:097'],
    excludeTrains: true,
};