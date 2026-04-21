"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStates } from "@/utils/api/states/fetch";
import { fetchCities } from "@/utils/api/city/fetch";
import { fetchCountries } from "@/utils/api/countries/fetch";
import { CityData } from "@/types/cities";
import { ProvinceData } from "@/types/provinces";
import { CountryData } from "@/types/countries";

export function useLocationData(enabled: boolean = true) {
  const [states, setStates] = useState<ProvinceData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [openState, setOpenState] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const [openCountry, setOpenCountry] = useState(false);
  const [currentState, setCurrentState] = useState<{
    id: number;
    name: string;
  }>({ id: 0, name: "" });
  const [currentCity, setCurrentCity] = useState<{
    id: number;
    name: string;
    timezone: string;
  }>({
    id: 0,
    name: "",
    timezone: "",
  });
  const [currentCountry, setCurrentCountry] = useState<{
    id: number;
    name: string;
  }>({ id: 0, name: "" });
  const [selectedState, setSelectedState] = useState<{
    id: number;
    name: string;
  }>({ id: 0, name: "" });
  const [selectedCity, setSelectedCity] = useState<{
    id: number;
    name: string;
    timezone: string;
  }>({ id: 0, name: "", timezone: "" });
  const [selectedCountry, setSelectedCountry] = useState<{
    id: number;
    name: string;
  }>({ id: 0, name: "" });

  // Refs to prevent double fetching in strict mode or re-renders
  const countriesLoadedRef = useRef(false);

  // Load countries on mount only once with caching
  useEffect(() => {
    if (!enabled || countriesLoadedRef.current) return;

    // Check cache first
    const cached = localStorage.getItem("countries_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCountries(parsed);
          countriesLoadedRef.current = true;
          return;
        } else {
          localStorage.removeItem("countries_cache");
        }
      } catch (e) {
        localStorage.removeItem("countries_cache");
      }
    }

    const load = async () => {
      countriesLoadedRef.current = true;
      const result = await fetchCountries();
      if (result.success && result.data && result.data.length > 0) {
        setCountries(result.data);
        localStorage.setItem("countries_cache", JSON.stringify(result.data));
      } else {
        console.warn("[useLocationData] Failed to load countries or empty list", result);
        // Allow reload next time if empty
        countriesLoadedRef.current = false;
      }
    };

    load();
  }, []); // Run once on mount

  // Load states when country changes (with caching)
  useEffect(() => {
    if (!enabled) {
      setStates([]);
      return;
    }
    const countryId = selectedCountry.id !== 0 ? selectedCountry.id : currentCountry.id;
    if (countryId && countryId !== 0) {
      const cacheKey = `states_cache_${countryId}`;

      // Check cache first
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStates(parsed);
            return;
          }
          localStorage.removeItem(cacheKey);
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      const load = async () => {
        console.log(`[useLocationData] Fetching states for country ${countryId}...`);
        const result = await fetchStates(countryId);
        if (result.success && result.data && result.data.length > 0) {
          setStates(result.data);
          localStorage.setItem(cacheKey, JSON.stringify(result.data));
        } else {
          console.warn("[useLocationData] No states found for country:", countryId, result);
          setStates([]);
        }
      };
      load();
    } else {
      setStates([]);
    }
  }, [selectedCountry.id, currentCountry.id]);

  // Load cities when state changes (with caching)
  useEffect(() => {
    if (!enabled) {
      // Don't clear cities if disabled to preserve current state display
      return;
    }
    const stateId = selectedState.id !== 0 ? selectedState.id : currentState.id;
    if (stateId && stateId !== 0) {
      const cacheKey = `cities_cache_${stateId}`;
      // Check cache first
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCities(parsed);
            return;
          }
          // If empty, clear it
          localStorage.removeItem(cacheKey);
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      const load = async () => {
        console.log(`[useLocationData] Fetching cities for state ${stateId}...`);
        const result = await fetchCities(stateId);
        if (result.success && result.data && result.data.length > 0) {
          setCities(result.data);
          localStorage.setItem(cacheKey, JSON.stringify(result.data));
        } else {
          console.warn("[useLocationData] No cities found for state:", stateId, result);
          setCities([]);
        }
      };
      load();
    } else {
      // Don't clear cities immediately
    }
  }, [selectedState.id, currentState.id]);

  // Update city name after cities are loaded (sync name if only ID provided)
  useEffect(() => {
    if (currentCity.id !== 0 && !currentCity.name && cities.length > 0) {
      const foundCity = cities.find((city) => city.id === currentCity.id);
      if (foundCity) {
        setCurrentCity((prev) => ({ ...prev, name: foundCity.name || "" }));
      }
    }
  }, [currentCity.id, currentCity.name, cities]);

  return {
    states,
    cities,
    countries,
    openState,
    setOpenState,
    openCity,
    setOpenCity,
    openCountry,
    setOpenCountry,
    currentState,
    setCurrentState,
    currentCity,
    setCurrentCity,
    currentCountry,
    setCurrentCountry,
    selectedState,
    setSelectedState,
    selectedCity,
    setSelectedCity,
    selectedCountry,
    setSelectedCountry,
  };
}
