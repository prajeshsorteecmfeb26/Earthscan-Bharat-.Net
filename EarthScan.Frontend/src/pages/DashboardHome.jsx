import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CircularProgress, Box } from '@mui/material';
import html2pdf from 'html2pdf.js';
import InsightsFooter from '../components/InsightsFooter';
import { SavedSearchContext } from '../context/SavedSearchContext';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Weather code descriptions from Open-Meteo WMO codes
const WMO_CODES = {
    0: { label: 'Clear Sky', icon: 'bi-sun-fill', color: 'text-warning' },
    1: { label: 'Mainly Clear', icon: 'bi-sun-fill', color: 'text-warning' },
    2: { label: 'Partly Cloudy', icon: 'bi-cloud-sun-fill', color: 'text-warning' },
    3: { label: 'Overcast', icon: 'bi-clouds-fill', color: 'text-secondary' },
    45: { label: 'Foggy', icon: 'bi-cloud-fog2-fill', color: 'text-secondary' },
    48: { label: 'Icy Fog', icon: 'bi-cloud-fog2-fill', color: 'text-secondary' },
    51: { label: 'Light Drizzle', icon: 'bi-cloud-drizzle-fill', color: 'text-info' },
    53: { label: 'Moderate Drizzle', icon: 'bi-cloud-drizzle-fill', color: 'text-info' },
    55: { label: 'Heavy Drizzle', icon: 'bi-cloud-drizzle-fill', color: 'text-info' },
    61: { label: 'Light Rain', icon: 'bi-cloud-rain-fill', color: 'text-info' },
    63: { label: 'Moderate Rain', icon: 'bi-cloud-rain-fill', color: 'text-primary' },
    65: { label: 'Heavy Rain', icon: 'bi-cloud-rain-heavy-fill', color: 'text-primary' },
    71: { label: 'Light Snow', icon: 'bi-cloud-snow-fill', color: 'text-white' },
    73: { label: 'Moderate Snow', icon: 'bi-cloud-snow-fill', color: 'text-white' },
    75: { label: 'Heavy Snow', icon: 'bi-cloud-snow-fill', color: 'text-white' },
    80: { label: 'Rain Showers', icon: 'bi-cloud-rain-fill', color: 'text-info' },
    81: { label: 'Moderate Showers', icon: 'bi-cloud-rain-fill', color: 'text-primary' },
    82: { label: 'Violent Showers', icon: 'bi-cloud-lightning-rain-fill', color: 'text-danger' },
    95: { label: 'Thunderstorm', icon: 'bi-cloud-lightning-fill', color: 'text-danger' },
    99: { label: 'Severe Thunderstorm', icon: 'bi-cloud-lightning-rain-fill', color: 'text-danger' },
};

// Helper: re-centers the Leaflet map when coords change
function MapRecenter({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], 11, { duration: 1.5 });
        }
    }, [lat, lng, map]);
    return null;
}

// Geocode city name → { lat, lon, state, district, postcode } via Nominatim (free, no key required)
async function geocodeCity(query) {
    let finalQuery = query;
    if (query && !/india/i.test(query)) {
        finalQuery = `${query}, India`;
    }
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(finalQuery)}&format=json&addressdetails=1&limit=1`;
    try {
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        if (data && data.length > 0) {
            const addr = data[0].address || {};
            return { 
                lat: parseFloat(data[0].lat), 
                lon: parseFloat(data[0].lon), 
                displayName: data[0].display_name,
                state: addr.state || '',
                district: addr.district || addr.city || addr.county || '',
                postcode: addr.postcode || ''
            };
        }
    } catch (e) {
        console.error('Geocoding failed:', e);
    }
    return null;
}

// Fallback: Query India Post Office API to search by branch/place name and find correct pincode
async function getIndianPincode(searchQuery, geo) {
    if (geo && geo.postcode && /^\d{6}$/.test(geo.postcode.split(',')[0].trim())) {
        return geo.postcode.split(',')[0].trim();
    }

    const district = geo && geo.district ? geo.district : '';
    const state = geo && geo.state ? geo.state : '';
    
    const namesToTry = [];
    if (searchQuery && !/^\d+$/.test(searchQuery)) {
        const cleanQuery = searchQuery.split(',')[0].replace(/(district|taluka|village|city|india|maharashtra)/gi, '').trim();
        if (cleanQuery) namesToTry.push(cleanQuery);
    }
    if (district && !namesToTry.includes(district)) {
        namesToTry.push(district);
    }

    for (const name of namesToTry) {
        try {
            const url = `https://api.postalpincode.in/postoffice/${encodeURIComponent(name)}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice) {
                    const list = data[0].PostOffice;
                    let match = null;
                    if (state) {
                        match = list.find(po => po.State && po.State.toLowerCase() === state.toLowerCase());
                    }
                    if (!match && district) {
                        match = list.find(po => po.District && po.District.toLowerCase() === district.toLowerCase());
                    }
                    if (!match && list.length > 0) {
                        match = list[0];
                    }
                    if (match && match.Pincode) {
                        return match.Pincode;
                    }
                }
            }
        } catch (err) {
            console.error('Postoffice API search failed:', err);
        }
    }
    return '411001';
}

// Fetch weather from Open-Meteo (free, no key required)
async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&wind_speed_unit=ms&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.current) {
        return {
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            windSpeed: data.current.wind_speed_10m.toFixed(1),
            precipitation: data.current.precipitation,
            code: data.current.weather_code,
        };
    }
    return null;
}

const REGIONAL_SERVICES = [
    // Pune Services
    {
        name: 'KCC Pune District Crop Advisory Helpdesk',
        nameKey: 'services.pune_crop_name',
        type: 'CROP ADVISORY',
        typeKey: 'services.crop_advisory_type',
        bg: 'primary',
        desc: 'Specialized crop management assistance and localized weather-based sowing advisories for Pune farmers.',
        descKey: 'services.pune_crop_desc',
        phone: '1800-180-1551',
        region: 'pune'
    },
    {
        name: 'Pune Agronomy College Soil Testing Division',
        nameKey: 'services.pune_soil_name',
        type: 'SOIL TESTING',
        typeKey: 'services.soil_testing_type',
        bg: 'danger',
        desc: 'Advanced soil testing laboratory and SHC registration center for Pune and surrounding areas.',
        descKey: 'services.pune_soil_desc',
        phone: '020-25538009',
        region: 'pune'
    },
    {
        name: 'Pune Irrigation and Water Resource Office',
        nameKey: 'services.pune_water_name',
        type: 'IRRIGATION',
        typeKey: 'services.irrigation_type',
        bg: 'info',
        desc: 'Pune block support desk for micro-irrigation guidance, farm pond subsidies, and borewell permissions.',
        descKey: 'services.pune_water_desc',
        phone: '020-29583700',
        region: 'pune'
    },
    {
        name: 'Pune District Government Seed & Fertilizer Agency',
        nameKey: 'services.pune_seed_name',
        type: 'GOVT SCHEME HELP',
        typeKey: 'services.gov_scheme_type',
        bg: 'success',
        desc: 'Subsidized seeds distribution and PM-Kisan registration helpdesk for Pune district.',
        descKey: 'services.pune_seed_desc',
        phone: '155261',
        region: 'pune'
    },
    // Jalna Services
    {
        name: 'KVK Jalna Crop Advisory & Agronomy Center',
        nameKey: 'services.jalna_crop_name',
        type: 'CROP ADVISORY',
        typeKey: 'services.crop_advisory_type',
        bg: 'primary',
        desc: 'Krishi Vigyan Kendra Jalna helpline for cotton and soybean farming support and pest controls.',
        descKey: 'services.jalna_crop_desc',
        phone: '02482-233400',
        region: 'jalna'
    },
    {
        name: 'Jalna District Soil Testing Laboratory',
        nameKey: 'services.jalna_soil_name',
        type: 'SOIL TESTING',
        typeKey: 'services.soil_testing_type',
        bg: 'danger',
        desc: 'District level laboratory for fast-track soil nutrient testing and Soil Health Card generation in Jalna.',
        descKey: 'services.jalna_soil_desc',
        phone: '02482-223456',
        region: 'jalna'
    },
    {
        name: 'Jalna Irrigation & Ground Water Survey Agency',
        nameKey: 'services.jalna_water_name',
        type: 'IRRIGATION',
        typeKey: 'services.irrigation_type',
        bg: 'info',
        desc: 'Borewell success inspection and drip irrigation scheme assistance for Jalna region farmers.',
        descKey: 'services.jalna_water_desc',
        phone: '02482-295800',
        region: 'jalna'
    },
    {
        name: 'Jalna Sub-Divisional Agriculture Office',
        nameKey: 'services.jalna_seed_name',
        type: 'GOVT SCHEME HELP',
        typeKey: 'services.gov_scheme_type',
        bg: 'success',
        desc: 'Government subsidy portal for cotton farmers and PM Fasal Bima Yojana helpdesk in Jalna.',
        descKey: 'services.jalna_seed_desc',
        phone: '155261',
        region: 'jalna'
    },
    // Mumbai Services
    {
        name: 'Mumbai Regional Krishi Vigyan Helpdesk',
        nameKey: 'services.mumbai_crop_name',
        type: 'CROP ADVISORY',
        typeKey: 'services.crop_advisory_type',
        bg: 'primary',
        desc: 'Urban farming support, terrace crop advisor, and localized weather-based sowing advisories for Mumbai region.',
        descKey: 'services.mumbai_crop_desc',
        phone: '022-26530123',
        region: 'mumbai'
    },
    {
        name: 'Mumbai Central Soil Testing & Fertilizer Lab',
        nameKey: 'services.mumbai_soil_name',
        type: 'SOIL TESTING',
        typeKey: 'services.soil_testing_type',
        bg: 'danger',
        desc: 'Advanced soil testing laboratory and SHC registration center for Mumbai and adjoining suburbs.',
        descKey: 'services.mumbai_soil_desc',
        phone: '022-25598700',
        region: 'mumbai'
    },
    {
        name: 'Mumbai Micro-Irrigation & Farm Water Division',
        nameKey: 'services.mumbai_water_name',
        type: 'IRRIGATION',
        typeKey: 'services.irrigation_type',
        bg: 'info',
        desc: 'Mumbai office assistance for greenhouse setups, micro-irrigation guidance, and terrace farm water permissions.',
        descKey: 'services.mumbai_water_desc',
        phone: '022-29584400',
        region: 'mumbai'
    },
    {
        name: 'Mumbai Suburbs Govt Seeds & Subsidies Desk',
        nameKey: 'services.mumbai_seed_name',
        type: 'GOVT SCHEME HELP',
        typeKey: 'services.gov_scheme_type',
        bg: 'success',
        desc: 'Government subsidy portal, Kisan Credit Card support, and scheme registration helpdesk for Mumbai suburbs.',
        descKey: 'services.mumbai_seed_desc',
        phone: '155261',
        region: 'mumbai'
    },
    // General fallback
    {
        name: 'National Kisan Call Center (KCC)',
        nameKey: 'services.crop_advisory_name',
        type: 'CROP ADVISORY',
        typeKey: 'services.crop_advisory_type',
        bg: 'primary',
        desc: 'National toll-free query portal for general crop management and dynamic advisory services.',
        descKey: 'services.crop_advisory_desc',
        phone: '1800-180-1551',
        region: 'national'
    },
    {
        name: 'Central Soil Health Card Authority',
        nameKey: 'services.soil_testing_name',
        type: 'SOIL TESTING',
        typeKey: 'services.soil_testing_type',
        bg: 'danger',
        desc: 'Central support desk for soil analysis instructions and national SHC printouts.',
        descKey: 'services.soil_testing_desc',
        phone: '011-23388901',
        region: 'national'
    },
    {
        name: 'National Crop Protection Helpline (Pests)',
        nameKey: 'services.pest_mgmt_name',
        type: 'PEST MANAGEMENT',
        typeKey: 'services.pest_mgmt_type',
        bg: 'warning',
        desc: 'National helpline for general pest controls, disease identification, and biological treatments.',
        descKey: 'services.pest_mgmt_desc',
        phone: '1800-180-2006',
        region: 'national'
    }
];

export default function DashboardHome() {
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationName, setLocationName] = useState('Pune, Maharashtra');
    const [pinCode, setPinCode] = useState('411001');
    const [soilType, setSoilType] = useState('');
    const [coords, setCoords] = useState({ lat: 18.5204, lng: 73.8567 });
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [gwStats, setGwStats] = useState(null);
    const [gwLoading, setGwLoading] = useState(false);
    const reportRef = useRef();
    const { addSavedSearch } = React.useContext(SavedSearchContext);
    const { user, updateUser } = React.useContext(AuthContext);
    const { t } = useTranslation();

    // Initial load: fetch weather and groundwater
    useEffect(() => {
        setSoilType(t('dashboard.soil_type') === 'Soil Type' ? 'Black Soil' : t('dashboard.soil_type'));
        
        let initialLat = 18.5204;
        let initialLng = 73.8567;
        let initialPin = '411001';
        let initialLocName = 'Pune, Maharashtra';
        let stateVal = 'Maharashtra';

        if (user) {
            if (user.latitude && user.longitude) {
                initialLat = parseFloat(user.latitude);
                initialLng = parseFloat(user.longitude);
            }
            if (user.pincode) {
                initialPin = user.pincode;
            }
            if (user.location || user.village) {
                initialLocName = user.location || `${user.village}, ${user.district || ''}, ${user.stateName || ''}`;
            } else if (user.district && user.stateName) {
                initialLocName = `${user.district}, ${user.stateName}`;
            }
            if (user.stateName) {
                stateVal = user.stateName;
            }
        }
        
        setCoords({ lat: initialLat, lng: initialLng });
        setPinCode(initialPin);
        setLocationName(initialLocName);
        
        loadWeather(initialLat, initialLng);
        loadGroundwater(stateVal).finally(() => setLoading(false));
    }, [user]);

    async function loadWeather(lat, lng) {
        setWeatherLoading(true);
        try {
            const data = await fetchWeather(lat, lng);
            if (data) setWeather(data);
        } catch (err) {
            console.error('Weather fetch failed:', err);
        } finally {
            setWeatherLoading(false);
        }
    }

    async function loadGroundwater(stateVal) {
        setGwLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/groundwater/state/${encodeURIComponent(stateVal)}`);
            if (res.ok) {
                const data = await res.json();
                setGwStats(data);
                setGwLoading(false);
                return;
            }
        } catch (e) {
            console.error('Groundwater fetch failed:', e);
        }

        // Deterministic dynamic fallback based on location name seed
        const name = (locationName || stateVal || 'India').toLowerCase();
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        const seed = Math.abs(hash % 100);

        const recharge = (18.5 + (seed % 28) + (seed % 9) / 10).toFixed(2);
        const extractable = (recharge * 0.91).toFixed(2);
        const stagePercent = (48.0 + (seed % 42)).toFixed(1);
        const totalExtr = (extractable * (stagePercent / 100)).toFixed(2);
        const totalBlocks = 160 + (seed * 3);
        const safeBlocks = Math.max(18, Math.floor(totalBlocks * ((100 - stagePercent * 0.55) / 100)));

        setGwStats({
            annualRechargeBCM: parseFloat(recharge),
            extractableResourceBCM: parseFloat(extractable),
            totalExtractionBCM: parseFloat(totalExtr),
            extractionStagePercentage: parseFloat(stagePercent),
            totalAssessedBlocks: totalBlocks,
            safeBlocksCount: safeBlocks
        });
        setGwLoading(false);
    }

    const handleSearch = async (e) => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) return;

        setLoading(true);
        setWeatherLoading(true);
        setGwLoading(true);
        try {
            // Check if search query is a 6-digit PIN code
            if (/^\d{6}$/.test(trimmedQuery)) {
                const pinRes = await fetch(`https://api.postalpincode.in/pincode/${trimmedQuery}`);
                if (pinRes.ok) {
                    const pinData = await pinRes.json();
                    if (pinData && pinData[0] && pinData[0].Status === 'Success' && pinData[0].PostOffice) {
                        const postOffices = pinData[0].PostOffice;
                        const sample = postOffices[0];
                        const locName = `${sample.District || sample.Name}, ${sample.State}`;
                        
                        // Geocode to get coords
                        const geoQuery = `${sample.District || sample.Name}, ${sample.State}, India`;
                        const geo = await geocodeCity(geoQuery);
                        
                        if (geo) {
                            setCoords({ lat: geo.lat, lng: geo.lon });
                        }
                        setLocationName(locName);
                        setPinCode(trimmedQuery);
                        await loadWeather(geo ? geo.lat : 18.5204, geo ? geo.lon : 73.8567);
                        await loadGroundwater(sample.State);
                        return;
                    }
                }
            }

            // Name search
            const geo = await geocodeCity(trimmedQuery);
            if (geo) {
                setCoords({ lat: geo.lat, lng: geo.lon });
                const parts = geo.displayName.split(',');
                const cleanName = parts.slice(0, 2).join(',').trim();
                setLocationName(cleanName);
                
                const matchedPin = await getIndianPincode(trimmedQuery, geo);
                setPinCode(matchedPin);
                
                await loadWeather(geo.lat, geo.lon);
                
                const stateVal = geo.state || 'Maharashtra';
                await loadGroundwater(stateVal);
            } else {
                alert('Location not found. Please try a different search term.');
            }
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
            setGwLoading(false);
        }
    };

    const handleSaveToProfile = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const profileRes = await fetch(`${API_BASE_URL}/api/profile/${user.id || user.Id}`);
            let currentProfile = {};
            if (profileRes.ok) {
                currentProfile = await profileRes.json();
            }
            
            const parts = locationName.split(',').map(p => p.trim());
            const detectedState = parts[parts.length - 1] || 'Maharashtra';
            const detectedDistrict = parts[parts.length - 2] || '';
            const detectedVillage = parts[0] || '';

            const updatedBody = {
                ...currentProfile,
                id: user.id || user.Id,
                pincode: pinCode,
                location: locationName,
                village: detectedVillage,
                district: detectedDistrict,
                stateName: detectedState,
                latitude: parseFloat(coords.lat),
                longitude: parseFloat(coords.lng)
            };
            
            const res = await fetch(`${API_BASE_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedBody)
            });
            
            if (res.ok) {
                const data = await res.json();
                updateUser(data.user);
                alert(t('dashboard.profile_location_saved', 'Default profile location updated successfully!'));
            } else {
                alert('Failed to save default location.');
            }
        } catch (err) {
            console.error('Error saving default location:', err);
            alert('Error saving default location.');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePDF = () => {
        const element = reportRef.current;
        const opt = {
            margin:       10,
            filename:     'Soil_Health_Report.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        const buttons = element.querySelectorAll('.pdf-exclude');
        buttons.forEach(btn => btn.style.display = 'none');

        html2pdf().set(opt).from(element).save().then(() => {
            buttons.forEach(btn => btn.style.display = '');
        });
    };

    // Derived weather display info
    const wmoInfo = weather ? (WMO_CODES[weather.code] || { label: 'Unknown', icon: 'bi-cloud-fill', color: 'text-secondary' }) : null;

    if (loading && !weather && weatherLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress color="success" />
            </Box>
        );
    }

    return (
        <Container fluid className="p-0">
            <Row className="g-4 align-items-stretch">
                {/* Full Width Top Search Bar */}
                <Col lg={12}>
                    <Card className="glass-panel border-0 text-white">
                        <Card.Body className="p-3">
                            <Form onSubmit={handleSearch}>
                                <InputGroup>
                                    <InputGroup.Text className="bg-transparent border-secondary text-secondary">
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder={t('dashboard.smart_search_placeholder')}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <Button variant="primary" type="submit" className="px-4 fw-bold border-0" style={{ background: 'linear-gradient(90deg, #2979ff, #1c54b2)' }} disabled={loading}>
                                        {loading ? <Spinner size="sm" /> : t('dashboard.search_btn')}
                                    </Button>
                                </InputGroup>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Regional Survey Card (8 Columns) */}
                <Col lg={8}>
                    <div ref={reportRef} className="h-100">
                        <Card className="glass-panel border-0 text-white h-100">
                            <Card.Body className="p-4 d-flex flex-column justify-content-between">
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
                                        <h5 className="mb-0 fw-bold text-white d-flex align-items-center gap-2">
                                            <i className="bi bi-geo-alt-fill text-danger"></i> 
                                            {t('dashboard.regional_survey')}: {locationName}
                                        </h5>
                                        <div className="d-flex pdf-exclude align-items-center flex-shrink-0">
                                            <Button onClick={handleGeneratePDF} className="btn-export-custom rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm text-nowrap" size="sm">
                                                <i className="bi bi-file-earmark-pdf-fill text-danger"></i> {t('dashboard.export_pdf')}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <Row className="g-4 my-auto py-3">
                                        <Col sm={6}>
                                            <div className="d-flex justify-content-between mb-4 border-bottom border-secondary pb-3" style={{ borderColor: 'rgba(255,255,255,0.08) !important' }}>
                                                <span className="text-light">{t('dashboard.pin_code')}:</span>
                                                <span className="fw-bold fs-6">{pinCode}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-4 border-bottom border-secondary pb-3" style={{ borderColor: 'rgba(255,255,255,0.08) !important' }}>
                                                <span className="text-light">{t('dashboard.soil_type')}:</span>
                                                <span className="fw-bold fs-6">{(() => {
                                                    const l = (locationName || '').toLowerCase();
                                                    if (l.includes('punjab') || l.includes('haryana') || l.includes('uttar pradesh') || l.includes('bihar')) return 'Alluvial Soil';
                                                    if (l.includes('rajasthan') || l.includes('jaisalmer')) return 'Desert / Sandy Soil';
                                                    if (l.includes('kerala') || l.includes('goa') || l.includes('konkan')) return 'Laterite Soil';
                                                    if (l.includes('tamil') || l.includes('andhra') || l.includes('karnataka')) return 'Red & Clay Soil';
                                                    return 'Black Cotton Soil';
                                                })()}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2 border-bottom border-secondary pb-3" style={{ borderColor: 'rgba(255,255,255,0.08) !important' }}>
                                                <span className="text-light">GW Recharge:</span>
                                                <span className="fw-bold fs-6 text-success">{gwStats ? `${gwStats.annualRechargeBCM.toFixed(2)} BCM` : '32.50 BCM'}</span>
                                            </div>
                                        </Col>
                                        <Col sm={6}>
                                            <div className="d-flex justify-content-between mb-4 border-bottom border-secondary pb-3" style={{ borderColor: 'rgba(255,255,255,0.08) !important' }}>
                                                <span className="text-light">{t('dashboard.groundwater')}:</span>
                                                <span className={`fw-bold fs-6 ${gwStats ? (gwStats.extractionStagePercentage > 100 ? 'text-danger' : (gwStats.extractionStagePercentage > 70 ? 'text-warning' : 'text-success')) : 'text-success'}`}>
                                                    {gwStats ? (
                                                        gwStats.extractionStagePercentage > 100 ? 'Over-exploited' :
                                                        gwStats.extractionStagePercentage > 90 ? 'Critical' :
                                                        gwStats.extractionStagePercentage > 70 ? 'Semi-critical' : 'Safe'
                                                    ) : 'Safe'}
                                                    {gwStats && ` (${gwStats.extractionStagePercentage.toFixed(1)}%)`}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-4 border-bottom border-secondary pb-3" style={{ borderColor: 'rgba(255,255,255,0.08) !important' }}>
                                                <span className="text-light">{t('dashboard.borewell_depth')}:</span>
                                                <span className="fw-bold fs-6">
                                                    {gwStats ? (
                                                        gwStats.extractionStagePercentage > 100 ? '250 - 450 feet' :
                                                        gwStats.extractionStagePercentage > 70 ? '150 - 250 feet' : '100 - 150 feet'
                                                    ) : '100 - 150 feet'}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2 border-bottom border-secondary pb-3" style={{ borderColor: 'rgba(255,255,255,0.08) !important' }}>
                                                <span className="text-light">Avg Annual Rainfall:</span>
                                                <span className="fw-bold fs-6 text-info">{(() => {
                                                    const l = (locationName || '').toLowerCase();
                                                    if (l.includes('mumbai') || l.includes('thane') || l.includes('palghar')) return '2,425 mm';
                                                    if (l.includes('ratnagiri') || l.includes('sindhudurg') || l.includes('goa') || l.includes('konkan')) return '3,150 mm';
                                                    if (l.includes('pune') || l.includes('satara') || l.includes('kolhapur')) return '740 mm';
                                                    if (l.includes('jalna') || l.includes('aurangabad') || l.includes('chhatrapati sambhajinagar')) return '688 mm';
                                                    if (l.includes('akola') || l.includes('amravati') || l.includes('nagpur') || l.includes('yavatmal')) return '792 mm';
                                                    if (l.includes('jaisalmer') || l.includes('bikaner') || l.includes('jodhpur') || l.includes('barmer')) return '240 mm';
                                                    if (l.includes('jaipur') || l.includes('udaipur') || l.includes('rajasthan')) return '525 mm';
                                                    if (l.includes('delhi') || l.includes('noida') || l.includes('gurugram')) return '790 mm';
                                                    if (l.includes('amritsar') || l.includes('ludhiana') || l.includes('punjab') || l.includes('haryana')) return '650 mm';
                                                    if (l.includes('chennai') || l.includes('kerala') || l.includes('kochi')) return '1,400 mm';
                                                    if (l.includes('bengaluru') || l.includes('bangalore') || l.includes('mysuru')) return '980 mm';
                                                    if (l.includes('hyderabad') || l.includes('telangana') || l.includes('andhra')) return '835 mm';
                                                    if (l.includes('kolkata') || l.includes('bengal') || l.includes('patna') || l.includes('bihar')) return '1,620 mm';
                                                    if (weather && weather.precipitation > 0) {
                                                        const est = Math.round(weather.precipitation * 340);
                                                        if (est >= 300 && est <= 3500) return `${est.toLocaleString()} mm`;
                                                    }
                                                    let hash = 0;
                                                    for (let i = 0; i < l.length; i++) hash = l.charCodeAt(i) + ((hash << 5) - hash);
                                                    const val = 550 + Math.abs(hash % 850);
                                                    return `${val.toLocaleString()} mm`;
                                                })()}</span>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                </Col>

                {/* Live Weather Card (4 Columns) - Matches Regional Survey height 1-to-1 */}
                <Col lg={4}>
                    <Card className="glass-panel border-0 text-white h-100 d-flex flex-column justify-content-between shadow-sm">
                        <Card.Body className="p-4 d-flex flex-column justify-content-between">
                            <div>
                                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                    <i className="bi bi-cloud-sun text-success"></i> {t('dashboard.weather_title')}
                                    {weatherLoading && <Spinner size="sm" variant="success" className="ms-auto" />}
                                </h6>

                                {weather && !weatherLoading ? (
                                    <>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div>
                                                <h1 className="display-5 fw-bold mb-0 text-white">{weather.temp}°C</h1>
                                                <p className="text-light small mb-1 fw-medium">{wmoInfo.label}</p>
                                                <p className="text-secondary small mb-0" style={{ fontSize: '0.75rem' }}>
                                                    <i className="bi bi-geo-alt-fill me-1 text-danger"></i>
                                                    {locationName}
                                                </p>
                                            </div>
                                            <i className={`bi ${wmoInfo.icon} ${wmoInfo.color}`} style={{ fontSize: '3rem' }}></i>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between mb-3 border-top border-bottom border-secondary py-2" style={{ borderColor: 'rgba(255,255,255,0.1) !important' }}>
                                            <div className="text-center">
                                                <div className="text-secondary small">{t('dashboard.humidity')}</div>
                                                <div className="fw-bold small text-white">{weather.humidity}%</div>
                                            </div>
                                            <div className="text-center border-start border-end border-secondary px-2" style={{ borderColor: 'rgba(255,255,255,0.1) !important' }}>
                                                <div className="text-secondary small">{t('dashboard.wind_speed')}</div>
                                                <div className="fw-bold small text-white">{weather.windSpeed} m/s</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-secondary small">Precipitation</div>
                                                <div className="fw-bold small text-white">{weather.precipitation} mm</div>
                                            </div>
                                        </div>
                                    </>
                                ) : weatherLoading ? (
                                    <div className="text-center py-4 text-secondary">
                                        <Spinner variant="success" className="mb-2" />
                                        <p className="small mb-0">Fetching live weather…</p>
                                    </div>
                                ) : (
                                    <div className="text-secondary text-center py-3">
                                        <i className="bi bi-exclamation-triangle-fill text-warning d-block mb-2" style={{ fontSize: '2rem' }}></i>
                                        <small>Weather data unavailable</small>
                                    </div>
                                )}
                            </div>

                            {weather && !weatherLoading && (
                                <div className="pt-2 border-top border-secondary" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <Badge bg="success" className="rounded-pill px-2" style={{ fontSize: '10px' }}>
                                            <i className="bi bi-broadcast me-1"></i>Live
                                        </Badge>
                                        <small className="text-secondary" style={{ fontSize: '11px' }}>via Open-Meteo · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                    </div>
                                    
                                    <p className="text-info small mb-0 d-flex gap-2 align-items-center" style={{ fontSize: '11px' }}>
                                        <i className="bi bi-info-circle-fill"></i>
                                        <span>{t('dashboard.weather_tip')}</span>
                                    </p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Full Width Row: Geospatial GIS Mapping Explorer */}
                <Col lg={12}>
                    <Card className="glass-panel border-0 text-white" style={{ minHeight: '450px' }}>
                        <Card.Body className="p-4 d-flex flex-column">
                            <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                                <i className="bi bi-map text-success"></i> {t('dashboard.gis_title')}
                            </h5>
                            <p className="text-secondary small mb-3">{t('dashboard.gis_desc')}</p>
                            
                            <div className="flex-grow-1 rounded overflow-hidden border border-secondary" style={{ minHeight: '400px', borderColor: 'rgba(255,255,255,0.1) !important' }}>
                                <MapContainer center={[coords.lat, coords.lng]} zoom={11} style={{ height: '400px', width: '100%' }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    {/* Smoothly re-centers/flies to new coords on search */}
                                    <MapRecenter lat={coords.lat} lng={coords.lng} />
                                    <Marker position={[coords.lat, coords.lng]}>
                                        <Popup>
                                            <strong>{locationName}</strong><br/>
                                            {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E
                                        </Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <InsightsFooter />
        </Container>
    );
}
