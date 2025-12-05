/**
 * LocationInput Component
 * 
 * A text input with location suggestions powered by Nominatim geocoding.
 * Includes debouncing and rate limiting to respect Nominatim's usage policy.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchLocations } from '../../services/geocoding';
import './LocationInput.css';

// Debounce delay for search (ms) - also helps with rate limiting
const SEARCH_DEBOUNCE_MS = 500;

// Minimum query length to trigger search
const MIN_QUERY_LENGTH = 3;

/**
 * LocationInput Component
 * 
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Called when value changes
 * @param {function} [props.onLocationSelect] - Called when a suggestion is selected
 * @param {string} [props.placeholder] - Input placeholder text
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.id] - Input ID
 * @param {string} [props.name] - Input name
 * @param {boolean} [props.required] - Whether input is required
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {boolean} [props.showSuggestions=true] - Whether to show location suggestions
 */
const LocationInput = ({
    value,
    onChange,
    onLocationSelect,
    placeholder = 'Enter location...',
    className = '',
    id,
    name,
    required,
    disabled,
    showSuggestions = true
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState(null);

    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const debounceTimerRef = useRef(null);

    // Fetch suggestions with debouncing
    const fetchSuggestions = useCallback(async (query) => {
        if (!query || query.length < MIN_QUERY_LENGTH) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const results = await searchLocations(query, { limit: 5 });
            setSuggestions(results);
            setShowDropdown(results.length > 0);
            setSelectedIndex(-1);
        } catch (err) {
            console.error('[LocationInput] Search error:', err);
            setError('Failed to fetch suggestions');
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle input change with debouncing
    const handleInputChange = useCallback((e) => {
        const newValue = e.target.value;
        onChange(e);

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!showSuggestions) {
            return;
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            fetchSuggestions(newValue);
        }, SEARCH_DEBOUNCE_MS);
    }, [onChange, fetchSuggestions, showSuggestions]);

    // Handle suggestion selection
    const handleSelectSuggestion = useCallback((suggestion) => {
        // Create a synthetic event-like object for onChange
        const syntheticEvent = {
            target: {
                name: name,
                value: suggestion.displayName
            }
        };
        onChange(syntheticEvent);

        if (onLocationSelect) {
            onLocationSelect(suggestion);
        }

        setSuggestions([]);
        setShowDropdown(false);
        setSelectedIndex(-1);
    }, [name, onChange, onLocationSelect]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!showDropdown || suggestions.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    e.preventDefault();
                    handleSelectSuggestion(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                setSelectedIndex(-1);
                break;
            default:
                break;
        }
    }, [showDropdown, suggestions, selectedIndex, handleSelectSuggestion]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                inputRef.current &&
                !inputRef.current.contains(e.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Format display name to be more readable
    const formatSuggestion = (displayName) => {
        // Truncate long names
        if (displayName.length > 80) {
            const parts = displayName.split(',');
            if (parts.length > 3) {
                return `${parts[0]}, ${parts[1]}, ... ${parts[parts.length - 1]}`.trim();
            }
        }
        return displayName;
    };

    return (
        <div className={`location-input ${className}`}>
            <div className="location-input__wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    id={id}
                    name={name}
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setShowDropdown(true);
                        }
                    }}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className="location-input__field form-input"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={showDropdown}
                    aria-haspopup="listbox"
                />
                {loading && (
                    <div className="location-input__spinner" aria-label="Loading suggestions" />
                )}
            </div>

            {showDropdown && suggestions.length > 0 && (
                <ul
                    ref={dropdownRef}
                    className="location-input__dropdown"
                    role="listbox"
                    aria-label="Location suggestions"
                >
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.placeId || index}
                            role="option"
                            aria-selected={index === selectedIndex}
                            className={`location-input__option ${index === selectedIndex ? 'location-input__option--selected' : ''
                                }`}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <span className="location-input__option-icon">📍</span>
                            <div className="location-input__option-content">
                                <span className="location-input__option-name">
                                    {formatSuggestion(suggestion.displayName)}
                                </span>
                                <span className="location-input__option-type">
                                    {suggestion.type}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {error && (
                <div className="location-input__error" role="alert">
                    {error}
                </div>
            )}

            {showSuggestions && (
                <div className="location-input__hint">
                    Powered by <a href="https://nominatim.openstreetmap.org/" target="_blank" rel="noopener noreferrer">Nominatim</a> / OpenStreetMap
                </div>
            )}
        </div>
    );
};

export default LocationInput;
