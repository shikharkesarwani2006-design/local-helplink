
"use client";

import { useMemo } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup 
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Navigation, ChevronRight, Droplets, BookOpen, Wrench, AlertTriangle, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import L from "leaflet";

interface MapDashboardProps {
  requests: any[];
  userLocation: { lat: number; lng: number } | null;
  onAccept: (request: any) => void;
}

export default function MapDashboard({ requests, userLocation, onAccept }: MapDashboardProps) {
  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      default: return "#10b981";
    }
  };

  const createCustomIcon = (urgency: string) => {
    const color = getUrgencyColor(urgency);
    const html = `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `;
    return new L.DivIcon({
      className: "custom-div-icon",
      html,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  const userIcon = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }, []);

  return (
    <Card className="w-full h-[600px] rounded-3xl overflow-hidden border-none shadow-xl bg-white relative">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userLocation && userIcon && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="text-center font-bold">You are here</div>
            </Popup>
          </Marker>
        )}

        {requests.map((request) => (
          request.location?.lat && request.location?.lng && (
            <Marker 
              key={request.id} 
              position={[request.location.lat, request.location.lng]}
              icon={createCustomIcon(request.urgency)}
            >
              <Popup className="custom-popup">
                <div className="w-64 p-2 space-y-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={cn("capitalize px-2 py-0.5 text-[10px] font-bold border-2")}>
                      {request.urgency}
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {request.createdAt ? formatDistanceToNow(request.createdAt.toDate()) : "just now"}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-headline font-bold text-slate-900 leading-tight">
                      {request.title}
                    </h4>
                    <p className="text-slate-500 text-xs line-clamp-2">
                      {request.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>{request.location?.area || "Campus Area"}</span>
                    </div>
                    {request.distance !== null && (
                      <div className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase">
                        <Navigation className="w-3 h-3" />
                        <span>{request.distance.toFixed(1)} km away</span>
                      </div>
                    )}
                  </div>

                  <Button 
                    size="sm" 
                    className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl font-bold h-9 mt-2"
                    onClick={() => onAccept(request)}
                  >
                    Accept Mission <ChevronRight className="ml-1 w-3 h-3" />
                  </Button>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
      
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-2">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mission Urgency</h5>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
          <span className="text-xs font-bold text-slate-700">High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
          <span className="text-xs font-bold text-slate-700">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span className="text-xs font-bold text-slate-700">Low</span>
        </div>
      </div>
    </Card>
  );
}
