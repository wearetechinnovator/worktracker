'use client';

export interface ClientLocationData {
  latitude?: number;
  longitude?: number;
  address?: string;
  label?: string;
  ip?: string;
}

/**
 * Fast client-side location & IP detector with multi-tier fallback.
 * Guaranteed to return location information and public IP.
 */
export async function getClientPunchLocation(): Promise<ClientLocationData> {
  let locationData: ClientLocationData = {};

  // Tier 1: Try browser geolocation with quick timeout
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const geoPromise = new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 3500, maximumAge: 60000 }
        );
      });

      const coords = await geoPromise;
      if (coords) {
        locationData.latitude = coords.latitude;
        locationData.longitude = coords.longitude;
        locationData.label = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

        // Attempt fast reverse geocoding
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const revRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (revRes.ok) {
            const revData = await revRes.json();
            if (revData?.address) {
              const city =
                revData.address.city ||
                revData.address.town ||
                revData.address.suburb ||
                revData.address.state_district ||
                '';
              const state = revData.address.state || '';
              const country = revData.address.country || '';
              const parts = [city, state, country].filter(Boolean);
              if (parts.length > 0) {
                locationData.address = parts.join(', ');
                locationData.label = parts.join(', ');
              }
            } else if (revData?.display_name) {
              locationData.address = revData.display_name.split(',').slice(0, 3).join(',').trim();
              locationData.label = locationData.address;
            }
          }
        } catch {
          // reverse geocode failed or timed out, keep coordinate label
        }
      }
    } catch {
      // geolocation denied or timed out
    }
  }

  // Tier 2: Fetch Public IP and IP-based fallback location
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Try ipapi.co
    const ipRes = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData?.ip) {
        locationData.ip = ipData.ip;
      }
      if (!locationData.address && (ipData.city || ipData.region || ipData.country_name)) {
        const parts = [ipData.city, ipData.region, ipData.country_name].filter(Boolean);
        locationData.address = parts.join(', ');
        locationData.label = parts.join(', ');
        if (!locationData.latitude && ipData.latitude) {
          locationData.latitude = ipData.latitude;
          locationData.longitude = ipData.longitude;
        }
      }
    }
  } catch {
    // Secondary IP fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const ipifyRes = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (ipifyRes.ok) {
        const ipifyData = await ipifyRes.json();
        if (ipifyData?.ip) {
          locationData.ip = ipifyData.ip;
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback defaults if still blank
  if (!locationData.address && !locationData.label) {
    locationData.address = 'Office / Remote';
    locationData.label = 'Office / Remote';
  }

  return locationData;
}
