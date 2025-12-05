/**
 * EventMap Component
 * 
 * Displays a location on an interactive OpenStreetMap using React-Leaflet.
 * Integrates with Nominatim geocoding service for location lookup.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { geocodeFirst } from '../../services/geocoding';
import './EventMap.css';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React-Leaflet (known webpack issue)
// The default icons don't load properly due to how webpack handles assets
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Configure default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Default center (Toronto, ON)
const DEFAULT_CENTER = [43.6532, -79.3832];
const DEFAULT_ZOOM = 15;

/**
 * Internal component to handle map view updates
 */
function MapViewUpdater({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, zoom || DEFAULT_ZOOM, { animate: true });
        }
    }, [map, center, zoom]);

    return null;
}

/**
 * EventMap Component
 * 
 * @param {Object} props
 * @param {string} props.location - Location string to geocode and display
 * @param {string} [props.eventName] - Name of the event (shown in popup)
 * @param {string} [props.className] - Additional CSS class
 * @param {number} [props.height=300] - Map height in pixels
 * @param {number} [props.zoom=15] - Initial zoom level
 * @param {boolean} [props.showLink=true] - Show "Get Directions" link in popup
 */
const EventMap = ({
    location,
    eventName,
    className = '',
    height = 300,
    zoom = DEFAULT_ZOOM,
    showLink = true
}) => {
    const [position, setPosition] = useState(null);
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const geocodeAttemptedRef = useRef(false);
    const lastLocationRef = useRef('');

    const geocodeLocation = useCallback(async (locationStr) => {
        if (!locationStr || locationStr.trim().length < 2) {
            setError('Location too short');
            return;
        }

        // Skip if we already tried this exact location
        if (lastLocationRef.current === locationStr && geocodeAttemptedRef.current) {
            return;
        }

        lastLocationRef.current = locationStr;
        geocodeAttemptedRef.current = true;
        setLoading(true);
        setError(null);
        setNotFound(false);

        try {
            const result = await geocodeFirst(locationStr);

            if (result) {
                setPosition([result.lat, result.lon]);
                setDisplayName(result.displayName);
            } else {
                setNotFound(true);
                setPosition(null);
            }
        } catch (err) {
            console.error('[EventMap] Geocoding error:', err);
            setError('Failed to load location');
            setPosition(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (location && location !== lastLocationRef.current) {
            geocodeAttemptedRef.current = false;
            geocodeLocation(location);
        }
    }, [location, geocodeLocation]);

    // Don't render if location not found or error
    if (notFound || error) {
        return null; // Silently fail - location might be free-form text
    }

    // Don't render while loading initially
    if (loading && !position) {
        return (
            <div className={`event-map event-map--loading ${className}`} style={{ height }}>
                <div className="event-map__loader">
                    <div className="event-map__spinner" />
                    <span>Loading map...</span>
                </div>
            </div>
        );
    }

    // Don't render if no position
    if (!position) {
        return null;
    }

    const osmUrl = `https://www.openstreetmap.org/?mlat=${position[0]}&mlon=${position[1]}#map=17/${position[0]}/${position[1]}`;

    return (
        <div className={`event-map ${className}`} style={{ height }}>
            <MapContainer
                center={position}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapViewUpdater center={position} zoom={zoom} />
                <Marker position={position}>
                    <Popup>
                        <div className="event-map__popup">
                            {eventName && <strong className="event-map__popup-title">{eventName}</strong>}
                            <span className="event-map__popup-location">{location}</span>
                            {displayName && displayName !== location && (
                                <span className="event-map__popup-address">{displayName}</span>
                            )}
                            {showLink && (
                                <a
                                    href={osmUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="event-map__popup-link"
                                >
                                    Get Directions (OpenStreetMap)
                                </a>
                            )}
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>
            <div className="event-map__attribution">
                Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
            </div>
        </div>
    );
};

export default EventMap;
