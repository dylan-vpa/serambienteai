import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationMapProps {
    latitude: number;
    longitude: number;
    height?: number;
}

export default function LocationMap({ latitude, longitude, height = 300 }: LocationMapProps) {
    const position: [number, number] = [latitude, longitude];

    return (
        <div style={{ height: `${height}px`, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer
                center={position}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position}>
                    <Popup>
                        Ubicación del muestreo<br />
                        Lat: {latitude.toFixed(6)}<br />
                        Lng: {longitude.toFixed(6)}
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
