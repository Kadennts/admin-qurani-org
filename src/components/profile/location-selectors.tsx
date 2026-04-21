"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { CountryData } from "@/types/countries"
import { ProvinceData } from "@/types/provinces"
import { CityData } from "@/types/cities"
import { Input } from "../ui/input"

interface LocationSelectorsProps {
  isEditing: boolean
  // Country
  countries: CountryData[]
  selectedCountry: { id: number; name: string }
  currentCountry: { id: number; name: string }
  openCountry: boolean
  setOpenCountry: (open: boolean) => void
  setSelectedCountry: (country: { id: number; name: string }) => void
  // State
  states: ProvinceData[]
  selectedState: { id: number; name: string }
  currentState: { id: number; name: string }
  openState: boolean
  setOpenState: (open: boolean) => void
  setSelectedState: (state: { id: number; name: string }) => void
  setSelectedCity: (city: { id: number; name: string, timezone: string }) => void
  // City
  cities: CityData[]
  selectedCity: { id: number; name: string, timezone: string }
  currentCity: { id: number; name: string }
  openCity: boolean
  setOpenCity: (open: boolean) => void
  timezone: string
}

export function LocationSelectors({
  isEditing,
  countries,
  selectedCountry,
  currentCountry,
  openCountry,
  setOpenCountry,
  setSelectedCountry,
  states,
  selectedState,
  currentState,
  openState,
  setOpenState,
  setSelectedState,
  setSelectedCity,
  cities,
  selectedCity,
  currentCity,
  openCity,
  setOpenCity,
  timezone
}: LocationSelectorsProps) {
  const { t } = useI18n()

  return (
    <>
      {/* timezone */}
      <div className="space-y-2">
        <Label htmlFor="timezone">{t('profile.timezone')}</Label>
        <Input
          id="timezone"
          type="tel"
          value={timezone}
          placeholder="-"
          disabled
        />
      </div>

      {/* Country Selectionn */}
      <div className="space-y-2">
        <Label htmlFor="country">{t('profile.country', 'Country')}</Label>
        <Popover open={openCountry} onOpenChange={setOpenCountry}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              disabled={!isEditing}
            >
              {selectedCountry.name || currentCountry.name || t('profile.select_country', 'Select Country')}
              {selectedCountry.id !== 0 && (
                <span
                  className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedCountry({ id: 0, name: "" })
                    setSelectedState({ id: 0, name: "" })
                    setSelectedCity({ id: 0, name: "", timezone: "" })
                  }}
                >
                  ×
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-full">
            <Command>
              <CommandInput placeholder={t('common.search', 'Search')} />
              <CommandList>
                <CommandGroup>
                  {(countries ?? []).map((country: CountryData) => (
                    <CommandItem
                      key={country.id}
                      className="w-full flex justify-between cursor-pointer"
                      onSelect={() => {
                        setSelectedCountry({
                          id: country.id,
                          name: country.name
                        })
                        setOpenCountry(false)
                      }}
                    >
                      {country.name}
                      <Check className={`w-4 h-4 ${selectedCountry.id !== 0 && selectedCountry.id === country.id
                        ? "opacity-100"
                        : selectedCountry.id === 0 && currentCountry.id === country.id
                          ? "opacity-100"
                          : "opacity-0"
                        }`} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* State Selection */}
      <div className="space-y-2">
        <Label htmlFor="state">{t('profile.province')}</Label>
        <Popover open={openState} onOpenChange={setOpenState}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              disabled={!isEditing}
            >
              {selectedState.name || currentState.name || t('profile.select_state', 'Select State')}
              {selectedState.id !== 0 && (
                <span
                  className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedState({ id: 0, name: "" })
                    setSelectedCity({ id: 0, name: "", timezone: "" })
                  }}
                >
                  ×
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-full">
            <Command>
              <CommandInput placeholder={t('common.search', 'Search')} />
              <CommandList>
                <CommandGroup>
                  {(states ?? []).map((state) => (
                    <CommandItem
                      key={state.id}
                      className="w-full flex justify-between cursor-pointer"
                      onSelect={() => {
                        setSelectedState({
                          id: state.id,
                          name: state.name
                        })
                        if (selectedCity.id !== 0) {
                          const selectedCityData = (cities ?? []).find(city => city.id === selectedCity.id)
                          if (selectedCityData && selectedCityData.state_id !== state.id) {
                            setSelectedCity({ id: 0, name: "", timezone: "" })
                          }
                        }
                        setOpenState(false)
                      }}
                    >
                      {state.name}
                      <Check className={`w-4 h-4 ${selectedState.id !== 0 && selectedState.id === state.id
                        ? "opacity-100"
                        : selectedState.id === 0 && currentState.id === state.id
                          ? "opacity-100"
                          : "opacity-0"
                        }`} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* City Selection */}
      <div className="space-y-2 relative">
        <Label htmlFor="city">{t('profile.city', 'City')}</Label>
        <Popover open={openCity} onOpenChange={setOpenCity}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left"
              disabled={!isEditing || (selectedState.id === 0 && currentState.id === 0)}
            >
              {selectedCity.name || currentCity.name || t('profile.select_city', 'Select City')}
              {selectedCity.id !== 0 && (
                <span
                  className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedCity({ id: 0, name: "", timezone: "" })
                  }}
                >
                  ×
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-full">
            <Command>
              <CommandInput placeholder={t('common.search', 'Search')} />
              <CommandList>
                <CommandGroup>
                  {cities?.map((city) => (
                    <CommandItem
                      key={city.id}
                      className="w-full flex justify-between cursor-pointer"
                      onSelect={() => {
                        setSelectedCity({
                          id: city.id,
                          name: city.name,
                          timezone: city.timezone
                        })
                        setOpenCity(false)
                      }}
                    >
                      {city.name}
                      <Check className={`w-4 h-4 ${selectedCity.id !== 0 && selectedCity.id === city.id
                        ? "opacity-100"
                        : selectedCity.id === 0 && currentCity.id === city.id
                          ? "opacity-100"
                          : "opacity-0"
                        }`} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </>
  )
}

