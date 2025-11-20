import { countries } from '#constants';

// Simple type for country codes
type CountriesEnum = string;

export const useCountry = () => {
    // State to store allowed countries
    const allowedCountries = useState<CountriesEnum[] | null>('allowedCountries', () => null);
    const isLoadingAllowedCountries = useState<boolean>('isLoadingAllowedCountries', () => false);

    // State to store the countries to be shown - init with static countries
    const countriesToShow = useState<GeoLocation[]>('countriesToShow', () => countries);

    // State to store states for each country state
    const countryStatesDict = useState<{ [code: string]: GeoLocation[] }>('countryStatesDict', () => ({}));
    const isLoadingCountryStates = useState<{ [code: string]: boolean }>('isLoadingCountryStates', () => ({}));

    // Function to get allowed countries from API (currently disabled, returns all countries)
    async function getAllowedCountries() {
        if (allowedCountries.value || isLoadingAllowedCountries.value) {
            return;
        }

        isLoadingAllowedCountries.value = true;

        try {
            // TODO: Replace with REST API call when needed
            // For now, allow all countries
            allowedCountries.value = countries.map(c => c.code);
            countriesToShow.value = countries;
        } catch (error) {
            console.error('Failed to retrieve allowed countries', error);
        } finally {
            isLoadingAllowedCountries.value = false;
        }
    }

    // Function to get states for a specific country from API - once
    async function getStatesForCountry(countryCode: CountriesEnum) {
        if (countryStatesDict.value[countryCode] || isLoadingCountryStates.value[countryCode]) {
            return;
        }

        isLoadingCountryStates.value[countryCode] = true;

        try {
            // TODO: Replace with REST API call when needed
            // For now, return empty array
            countryStatesDict.value[countryCode] = [];
        } catch (error) {
            console.error(`Failed to retrieve states for country ${countryCode}`, error);
        } finally {
            isLoadingCountryStates.value[countryCode] = false;
        }
    }

    return {
        getAllowedCountries,
        countriesToShow,
        getStatesForCountry,
        countryStatesDict,
    };
};
