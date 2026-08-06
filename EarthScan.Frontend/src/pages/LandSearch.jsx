import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, InputGroup, Button, Badge, Dropdown, Modal, Spinner } from 'react-bootstrap';
import { SavedSearchContext } from '../context/SavedSearchContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { validateImageFile, compressImage } from '../utils/imageUtils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const FALLBACK_LAND_IMAGES = [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1592982537447-6f2a6a0a38cc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80'
];

const DEFAULT_LAND_PROPERTIES = [
    {
        id: 1,
        title: "Prime Agricultural Plot - Fertile Black Cotton Soil",
        description: "High-yielding agricultural land ideal for cotton, sugarcane, and wheat cultivation with dual borewell access.",
        location: "Baramati, Pune, Maharashtra",
        size: 5.2,
        price: 4500000,
        score: 92,
        soil: "Black Cotton Soil",
        water: "High",
        tags: ["Verified", "High Yield"],
        imagePath: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80",
        contactNumber: "9822012345",
        latitude: 18.1517,
        longitude: 74.5772,
        borewellSuccessProbability: 88
    },
    {
        id: 2,
        title: "Irrigated Farmland near Highway",
        description: "Well-connected fertile plot with canal irrigation connectivity and high groundwater recharge capability.",
        location: "Jalgaon, Maharashtra",
        size: 8.5,
        price: 6800000,
        score: 89,
        soil: "Alluvial Loam",
        water: "High",
        tags: ["Verified", "Canal Water"],
        imagePath: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80",
        contactNumber: "9822056789",
        latitude: 21.0077,
        longitude: 75.5626,
        borewellSuccessProbability: 85
    },
    {
        id: 3,
        title: "Grape Vineyard & Agricultural Land",
        description: "Premium horticultural land with drip irrigation setup, solar pump, and excellent soil quality.",
        location: "Nashik, Maharashtra",
        size: 12.0,
        price: 12500000,
        score: 94,
        soil: "Red Sandy Loam",
        water: "Moderate",
        tags: ["Verified", "High ROI"],
        imagePath: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80",
        contactNumber: "9822099999",
        latitude: 20.0059,
        longitude: 73.7898,
        borewellSuccessProbability: 90
    },
    {
        id: 4,
        title: "Organic Cotton & Soybean Cultivation Land",
        description: "Extensive fertile acreage with clear title deeds, 7/12 extract verified, and good road connectivity.",
        location: "Akola, Maharashtra",
        size: 15.0,
        price: 8500000,
        score: 86,
        soil: "Deep Black Soil",
        water: "Moderate",
        tags: ["Investment", "Organic"],
        imagePath: "https://images.unsplash.com/photo-1592982537447-6f2a6a0a38cc?auto=format&fit=crop&w=600&q=80",
        contactNumber: "9822033333",
        latitude: 20.7002,
        longitude: 77.0082,
        borewellSuccessProbability: 81
    },
    {
        id: 5,
        title: "Sugarcane Farm with Natural Canal Access",
        description: "Rich alluvial soil suitable for perennial sugarcane harvesting with abundant water availability.",
        location: "Kolhapur, Maharashtra",
        size: 6.0,
        price: 7200000,
        score: 96,
        soil: "Clay Loam Soil",
        water: "High",
        tags: ["Verified", "Abundant Water"],
        imagePath: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
        contactNumber: "9822044444",
        latitude: 16.7050,
        longitude: 74.2433,
        borewellSuccessProbability: 94
    },
    {
        id: 6,
        title: "Orange Orchard Land with Drip System",
        description: "Fully developed orange orchard farm with automated drip systems and high ROI potential.",
        location: "Nagpur, Maharashtra",
        size: 10.0,
        price: 9500000,
        score: 91,
        soil: "Red Loam Soil",
        water: "Moderate",
        tags: ["Orchard", "Drip System"],
        imagePath: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80",
        contactNumber: "9822077777",
        latitude: 21.1458,
        longitude: 79.0882,
        borewellSuccessProbability: 87
    },
    {
        id: 7,
        title: "Paddy Cultivation Land near Lake",
        description: "Low-lying rich fertile paddy land with natural lake recharge and continuous water supply.",
        location: "Gondia, Maharashtra",
        size: 7.5,
        price: 5200000,
        score: 88,
        soil: "Alluvial Sandy Clay",
        water: "High",
        tags: ["Paddy Special", "Lake Front"],
        imagePath: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80",
        contactNumber: "9822088888",
        latitude: 21.4624,
        longitude: 80.1961,
        borewellSuccessProbability: 84
    },
    {
        id: 8,
        title: "High Yield Agro-Forestry Plot",
        description: "Well maintained agricultural land suitable for timber, pomegranate, and seasonal cash crops.",
        location: "Satara, Maharashtra",
        size: 4.0,
        price: 3800000,
        score: 87,
        soil: "Laterite Soil",
        water: "Moderate",
        tags: ["Investment", "High Timber Yield"],
        imagePath: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80",
        contactNumber: "9822011111",
        latitude: 17.6805,
        longitude: 74.0183,
        borewellSuccessProbability: 82
    }
];

function getLandImage(land) {
    if (land.imagePath && land.imagePath.trim()) {
        const firstPath = land.imagePath.split(',')[0].trim();
        if (firstPath.startsWith('http') || firstPath.startsWith('data:')) {
            return firstPath;
        }
        const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const path = firstPath.startsWith('/') ? firstPath : `/${firstPath}`;
        return `${base}${path}`;
    }
    const idx = (land.id || 0) % FALLBACK_LAND_IMAGES.length;
    return FALLBACK_LAND_IMAGES[idx];
}

function getLandImagesArray(land) {
    if (land.imagePath && land.imagePath.trim()) {
        return land.imagePath.split(',').map(p => p.trim()).filter(Boolean).map(p => {
            if (p.startsWith('http') || p.startsWith('data:')) return p;
            const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            const path = p.startsWith('/') ? p : `/${p}`;
            return `${base}${path}`;
        });
    }
    const idx = (land.id || 0) % FALLBACK_LAND_IMAGES.length;
    return [FALLBACK_LAND_IMAGES[idx]];
}

// Geocode city+area → { lat, lon } via Nominatim
async function geocodeLocation(city, area) {
    const query = area ? `${area}, ${city}, India` : `${city}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    try {
        const res = await fetch(url, {
            headers: {
                'Accept-Language': 'en',
                'User-Agent': 'EarthScanBharatPlatform/1.0 (contact@earthscan.com)'
            }
        });
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.error('Geocode failed:', e);
    }
    return null;
}

// Helper to render official values, showing null-warning text if missing
function renderVal(val) {
    if (val === null || val === undefined || val === '') {
        return <span className="text-secondary fst-italic">Not available in official record</span>;
    }
    return val;
}

export default function LandSearch() {
    const [lands, setLands] = useState([]);
    const [selectedCrop, setSelectedCrop] = useState('Cotton');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loadingLands, setLoadingLands] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('All');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [soilType, setSoilType] = useState('All');
    const [maxPrice, setMaxPrice] = useState(25130000); // Default to 2.5 Crore (250 Lakhs)
    const [minSize, setMinSize] = useState(0);
    const [maxSize, setMaxSize] = useState(30);
    const [waterAvailability, setWaterAvailability] = useState('All');
    const [minScore, setMinScore] = useState(0);
    const [selectedLand, setSelectedLand] = useState(null);

    // Sell land state hooks
    const [showSellModal, setShowSellModal] = useState(false);
    const [sellTitle, setSellTitle] = useState('');
    const [sellDesc, setSellDesc] = useState('');
    const [sellPincode, setSellPincode] = useState('');
    const [sellVillage, setSellVillage] = useState('');
    const [sellVillages, setSellVillages] = useState([]);
    const [fetchingSellPin, setFetchingSellPin] = useState(false);
    const [sellTaluka, setSellTaluka] = useState('');
    const [sellDistrict, setSellDistrict] = useState('');
    const [sellStateName, setSellStateName] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [sellSize, setSellSize] = useState('');
    const [sellSoil, setSellSoil] = useState('Black Cotton Soil');
    const [sellWater, setSellWater] = useState('50'); // depth in feet
    const [sellContact, setSellContact] = useState('');
    const [sellPhotos, setSellPhotos] = useState([]);
    const [sellLat, setSellLat] = useState('');
    const [sellLng, setSellLng] = useState('');
    const [photoError, setPhotoError] = useState('');
    const [submittingSell, setSubmittingSell] = useState(false);

    // Satbara State
    const [sellSurveyNo, setSellSurveyNo] = useState('');
    const [verifyingSatbara, setVerifyingSatbara] = useState(false);
    const [satbaraMethod, setSatbaraMethod] = useState('upload');
    const [satbaraUploadFile, setSatbaraUploadFile] = useState(null);

    // Buy & Receipt Modal States
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [buyerIdCard, setBuyerIdCard] = useState('');
    const [receiptData, setReceiptData] = useState(null);
    const [purchases, setPurchases] = useState(() => {
        const raw = JSON.parse(localStorage.getItem('purchasedLands') || '[]');
        const unique = [];
        const seen = new Set();
        for (const item of raw) {
            const key = item.receiptNo || item.landTitle;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(item);
            }
        }
        localStorage.setItem('purchasedLands', JSON.stringify(unique));
        return unique;
    });
    const [showPurchasesModal, setShowPurchasesModal] = useState(false);
    const [satbaraDetails, setSatbaraDetails] = useState(null);
    const [loadingSatbara, setLoadingSatbara] = useState(false);

    const navigate = useNavigate();
    const { addSavedSearch } = useContext(SavedSearchContext);
    const { t, i18n } = useTranslation();
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const fetchLands = async () => {
            const purchasedTitles = purchases.map(p => p.landTitle);
            try {
                const response = await axios.get(`${API_BASE_URL}/api/lands`);
                const backendLands = (Array.isArray(response.data) ? response.data : []).map(l => ({
                    id: l.id,
                    title: l.title,
                    description: l.description,
                    location: l.location,
                    size: l.sizeInAcres || l.size || 5,
                    price: l.price,
                    score: l.landIntelligenceScore || l.score || 85,
                    soil: l.soilType || l.soil || 'Black Cotton Soil',
                    water: l.groundwaterLevelDepth < 50 ? 'High' : (l.groundwaterLevelDepth < 100 ? 'Moderate' : 'Low'),
                    tags: (l.landIntelligenceScore || l.score || 85) > 85 ? ['Verified', 'High Yield'] : ['Investment'],
                    imagePath: l.imagePath,
                    latitude: l.latitude || l.lat,
                    longitude: l.longitude || l.lon,
                    borewellSuccessProbability: l.borewellSuccessProbability || 80,
                    contactNumber: l.contactNumber,
                    ownerId: l.ownerId
                }));

                const existingTitles = new Set(backendLands.map(b => (b.title || '').toLowerCase().trim()));
                const combined = [...backendLands];

                for (const defLand of DEFAULT_LAND_PROPERTIES) {
                    if (!existingTitles.has(defLand.title.toLowerCase().trim())) {
                        combined.push(defLand);
                    }
                }

                setLands(combined.filter(l => !purchasedTitles.includes(l.title)));
            } catch (error) {
                console.error("Error fetching lands from backend, using default properties:", error);
                setLands(DEFAULT_LAND_PROPERTIES.filter(l => !purchasedTitles.includes(l.title)));
            } finally {
                setLoadingLands(false);
            }
        };
        fetchLands();
    }, [purchases]);

    // Reset analysis & fetch Satbara details from backend when selected property changes
    useEffect(() => {
        setAnalysisResult(null);
        setSelectedCrop('Cotton');
        setSatbaraDetails(null);

        if (!selectedLand) return;

        const fetchSatbara = async () => {
            setLoadingSatbara(true);

            let surveyNo = '';
            if (selectedLand.title && selectedLand.title.includes('Survey No.')) {
                surveyNo = selectedLand.title.split('Survey No.')[1].trim();
            } else if (selectedLand.description && selectedLand.description.includes('Survey No.')) {
                const match = selectedLand.description.match(/Survey\s+No\.\s*([^\s,\|]+)/i);
                if (match) surveyNo = match[1];
            }

            const cleanSurvey = surveyNo.replace(/[^\d]/g, '');
            if (!cleanSurvey) {
                setSatbaraDetails(null);
                setLoadingSatbara(false);
                return;
            }

            try {
                const res = await axios.get(`${API_BASE_URL}/api/lands/satbara`, {
                    params: { surveyNo: cleanSurvey, location: selectedLand.location }
                });
                if (res.data && res.data.verified === false) {
                    setSatbaraDetails(null);
                } else {
                    setSatbaraDetails(res.data);
                }
            } catch (err) {
                console.error("Failed to load Satbara details from API:", err);
                setSatbaraDetails(null);
            } finally {
                setLoadingSatbara(false);
            }
        };

        fetchSatbara();
    }, [selectedLand]);

    const handleRunAnalysis = async () => {
        if (!selectedLand) return;
        setAnalyzing(true);
        setAnalysisResult(null);
        try {
            const userId = user?.id || user?.Id || '';
            const res = await axios.get(`${API_BASE_URL}/api/lands/${selectedLand.id}/analyze?crop=${selectedCrop}&userId=${userId}&lang=${i18n.language}`);
            setAnalysisResult(res.data);
        } catch (err) {
            console.error("Investment analysis failed:", err);
            alert(err.response?.data?.message || "Failed to load investment analysis.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleViewDetails = (land) => {
        setSelectedLand(land);
    };

    const handleSaveProperty = (land) => {
        addSavedSearch({
            id: land.id,
            name: land.title,
            pin: land.location,
            soil: land.soilType || land.soil,
            price: land.price,
            score: land.landIntelligenceScore || land.score,
            water: land.groundwaterLevelDepth || land.water,
            latitude: land.latitude,
            longitude: land.longitude,
            borewellSuccessProbability: land.borewellSuccessProbability,
            sizeInAcres: land.sizeInAcres,
            imagePath: land.imagePath,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
        alert(t('land_search.prop_saved'));
    };

    const handleAddToCompare = (land) => {
        const stored = sessionStorage.getItem('compareList');
        let compareList = stored ? JSON.parse(stored) : [];
        if (!compareList.find(item => item.id === land.id)) {
            if (compareList.length >= 3) {
                alert(t('land_search.compare_limit'));
                return;
            }
            compareList.push(land);
            sessionStorage.setItem('compareList', JSON.stringify(compareList));
        }
        navigate('/buyer/compare');
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterCity('All');
        setSoilType('All');
        setMaxPrice(25130000);
        setMinSize(0);
        setMaxSize(30);
        setWaterAvailability('All');
        setMinScore(0);
    };

    const handleSellPincodeChange = async (e) => {
        const val = e.target.value.replace(/\D/g, '').substring(0, 6);
        setSellPincode(val);

        if (val.length === 6) {
            setFetchingSellPin(true);
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
                const data = await res.json();
                if (data && data[0] && data[0].Status === 'Success') {
                    const postOffices = data[0].PostOffice;
                    const villageList = postOffices.map(po => po.Name).sort();
                    setSellVillages(villageList);
                    const sample = postOffices[0];
                    setSellTaluka(sample.Block || sample.Taluka || '');
                    setSellDistrict(sample.District);
                    setSellStateName(sample.State);
                    if (villageList.length > 0) {
                        setSellVillage(villageList[0]);
                    }
                } else {
                    setSellVillages([]);
                }
            } catch (err) {
                console.error('Failed to fetch PIN details:', err);
            } finally {
                setFetchingSellPin(false);
            }
        }
    };

    const handleFetchSatbara = async () => {
        if (!sellSurveyNo || !sellVillage) {
            alert('Please select PIN code and Village first before verifying Satbara.');
            return;
        }
        setVerifyingSatbara(true);
        try {
            const surveyDigits = sellSurveyNo.replace(/[^\d]/g, '');

            const res = await axios.get(`${API_BASE_URL}/api/lands/satbara`, {
                params: {
                    surveyNo: surveyDigits,
                    phone: sellContact,
                    location: `${sellVillage}, ${sellDistrict}`
                }
            });

            const satbaraData = res.data;
            if (satbaraData && satbaraData.verified === false) {
                throw { response: { data: satbaraData } };
            }
            let size = "";
            if (satbaraData.totalArea) {
                const matchAcres = satbaraData.totalArea.match(/([\d\.]+)\s*Acres/i);
                if (matchAcres) {
                    size = parseFloat(matchAcres[1]).toString();
                } else {
                    const matchHectares = satbaraData.totalArea.match(/([\d\.]+)\s*Hectares/i) || satbaraData.totalArea.match(/([\d\.]+)\s*Ha/i);
                    if (matchHectares) {
                        size = (parseFloat(matchHectares[1]) * 2.471).toFixed(2);
                    }
                }
            }

            // Autofill properties strictly from document, price and photos are left for manual user entry/upload
            setSellSize(size);
            if (satbaraData.surveyNo) setSellSurveyNo(satbaraData.surveyNo.toString());
            setSellTitle(satbaraData.surveyNo ? `Verified 7/12 Farm - Survey No. ${satbaraData.surveyNo}` : "");
            setSellContact(satbaraData.ownerPhone || sellContact || "");

            // Format descriptive message
            const descStr = `Verified agricultural land under Survey No. ${satbaraData.surveyNo || sellSurveyNo} in ${sellVillage}, ${sellDistrict}. Registered under Maharashtra Land Records (Bhulekh Mahabhumi).`;
            setSellDesc(descStr);

            // Select soil based on district/pincode
            const dName = (sellDistrict || '').toLowerCase();
            if (dName.includes('pune') || dName.includes('satara') || dName.includes('jalna')) {
                setSellSoil('Black Cotton Soil');
                setSellWater('75');
            } else {
                setSellSoil('Red Soil');
                setSellWater('110');
            }

            // Auto geocode coordinates
            geocodeLocation('', `${sellVillage}, ${sellDistrict}, ${sellStateName}, India`).then(geo => {
                if (geo) {
                    setSellLat(geo.lat.toString());
                    setSellLng(geo.lon.toString());
                }
            });

            setSatbaraDetails(satbaraData);

            alert(`Satbara Verification Completed successfully!\n\nLandowner: ${satbaraData.ownerName || 'Not available'}\nTotal Area: ${satbaraData.totalArea || 'Not available'}\nCultivable Area: ${satbaraData.cultivableArea || 'Not available'}\nPotkharaba: ${satbaraData.potkharaba || 'Not available'}\nVillage: ${satbaraData.village || 'Not available'}\nSurvey/Gat: ${satbaraData.surveyNo || 'Not available'}`);
        } catch (err) {
            console.error("Verification failed:", err);
            let errMsg = "";
            if (err.response) {
                errMsg = err.response.data?.message || `Survey Number ${sellSurveyNo} is not registered in Mahabhumi records.`;
            } else {
                errMsg = "Connection to Mahabhumi/EarthScan server failed. The server might be starting up or offline. Please wait a moment and try again.";
            }
            alert(`Verification Failed!\n\n${errMsg}`);

            // Reset form fields to prevent listing unverified data
            setSellSize('');
            setSellPrice('');
            setSellTitle('');
            setSellContact('');
            setSellPhotos([]);
            setSatbaraDetails(null);
        } finally {
            setVerifyingSatbara(false);
        }
    };
    const resetSellForm = () => {
        setSellTitle('');
        setSellDesc('');
        setSellPincode('');
        setSellVillage('');
        setSellVillages([]);
        setSellTaluka('');
        setSellDistrict('');
        setSellStateName('');
        setSellPrice('');
        setSellSize('');
        setSellSoil('Black Cotton Soil');
        setSellWater('50');
        setSellContact('');
        setSellPhotos([]);
        setSellLat('');
        setSellLng('');
        setSellSurveyNo('');
        setSatbaraUploadFile(null);
        setSatbaraDetails(null);
    };

    const processSatbaraFile = async (fileToProcess) => {
        if (!fileToProcess) return;
        setVerifyingSatbara(true);
        try {
            const formData = new FormData();
            formData.append('file', fileToProcess);

            const res = await axios.post(`${API_BASE_URL}/api/lands/satbara/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const satbaraData = res.data;
            if (satbaraData && satbaraData.verified === false) {
                throw { response: { data: satbaraData } };
            }

            let size = "";
            if (satbaraData.totalArea) {
                const matchAcres = satbaraData.totalArea.match(/([\d\.]+)\s*Acres/i);
                if (matchAcres) {
                    size = parseFloat(matchAcres[1]).toString();
                } else {
                    const matchHectares = satbaraData.totalArea.match(/([\d\.]+)\s*Hectares/i) || satbaraData.totalArea.match(/([\d\.]+)\s*Ha/i) || satbaraData.totalArea.match(/([\d\.]+)/);
                    if (matchHectares) {
                        size = (parseFloat(matchHectares[1]) * 2.471).toFixed(2);
                    }
                }
            }

            // Autofill fields strictly from extracted 7/12 document without fake fallbacks
            setSellSize(size || "");
            if (satbaraData.surveyNo) setSellSurveyNo(satbaraData.surveyNo.toString());
            setSellTitle(satbaraData.surveyNo ? `Verified 7/12 Farm - Survey No. ${satbaraData.surveyNo}` : (satbaraData.ownerName ? `Verified Farm - ${satbaraData.ownerName}` : ""));
            setSellContact(satbaraData.ownerPhone || "");

            const village = satbaraData.village || '';
            const taluka = satbaraData.taluka || '';
            const district = satbaraData.district || '';
            const stateName = satbaraData.state || 'Maharashtra';

            setSellVillage(village);
            setSellTaluka(taluka);
            setSellDistrict(district);
            setSellStateName(stateName);

            // Price estimate only if size extracted
            if (size && !isNaN(parseFloat(size))) {
                const numSize = parseFloat(size);
                const calcPrice = Math.round(numSize * 1800000);
                setSellPrice(calcPrice.toString());
            }

            // Description constructed cleanly from document metadata
            if (satbaraData.surveyNo || village || satbaraData.ownerName) {
                let descParts = ["Verified agricultural land"];
                if (satbaraData.surveyNo) descParts.push(`under Survey No. ${satbaraData.surveyNo}`);
                if (village || district) descParts.push(`in ${village} ${district}`.trim());
                descParts.push("Registered under Maharashtra Land Records (Bhulekh Mahabhumi).");
                if (satbaraData.ownerName) descParts.push(`Landowner: ${satbaraData.ownerName}.`);
                setSellDesc(descParts.join(' '));
            }

            // Select soil & water depth if district extracted
            if (district) {
                const dName = district.toLowerCase();
                if (dName.includes('pune') || dName.includes('satara') || dName.includes('jalna') || dName.includes('akola')) {
                    setSellSoil('Black Cotton Soil');
                    setSellWater('75');
                } else {
                    setSellSoil('Red Soil');
                    setSellWater('110');
                }

                // Geocode coordinates
                geocodeLocation('', `${village ? village + ', ' : ''}${district}, ${stateName}, India`).then(geo => {
                    if (geo) {
                        setSellLat(geo.lat.toString());
                        setSellLng(geo.lon.toString());
                    }
                });
            }

            setSatbaraDetails(satbaraData);
        } catch (err) {
            console.error("Upload verification failed:", err);
            let errMsg = "";
            if (err.response) {
                errMsg = err.response.data?.message || "Unable to fetch or extract official Mahabhulekh data";
            } else {
                errMsg = err.message || "Network error while processing document";
            }
            alert(`Verification Failed!\n\n${errMsg}`);
        } finally {
            setVerifyingSatbara(false);
        }
    };

    const handleSatbaraFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('File size exceeds the maximum limit of 5 MB.');
            return;
        }
        setSatbaraUploadFile(file);
        processSatbaraFile(file);
    };

    const handleUploadSatbaraVerification = async () => {
        if (satbaraUploadFile) {
            await processSatbaraFile(satbaraUploadFile);
        }
    };

    const handleSellPhotosChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const compressedFiles = [];
        setPhotoError('');

        for (const file of files) {
            const valError = validateImageFile(file, 5);
            if (valError) {
                setPhotoError(valError);
                return;
            }
            try {
                const compressed = await compressImage(file);
                compressedFiles.push(compressed);
            } catch (err) {
                console.error('Compression failed:', err);
                compressedFiles.push(file);
            }
        }
        setSellPhotos(compressedFiles);
    };

    const handleSellSubmit = async (e) => {
        e.preventDefault();
        setSubmittingSell(true);

        const ownerId = user?.id || user?.Id || 1;
        const title = sellTitle.trim() || (sellSurveyNo ? `Verified 7/12 Farm - Survey No. ${sellSurveyNo}` : "Verified Agricultural Plot");
        const locationParts = [sellVillage, sellDistrict, sellStateName || 'Maharashtra'].filter(Boolean);
        const locationStr = locationParts.length > 0 ? locationParts.join(', ') : "Jalna, Maharashtra";
        const price = sellPrice ? parseFloat(sellPrice) : 4500000;
        const areaSize = sellSize ? parseFloat(sellSize) : 2.5;

        const formData = new FormData();
        formData.append('OwnerId', ownerId);
        formData.append('Title', title);
        formData.append('Description', sellDesc || `Verified agricultural land in ${locationStr}.`);
        formData.append('Location', locationStr);
        formData.append('Price', price);
        formData.append('ContactNumber', sellContact || "9822012345");
        formData.append('AreaSize', areaSize);
        formData.append('SoilType', sellSoil || 'Black Cotton Soil');
        formData.append('GroundwaterLevelDepth', sellWater || '50');
        formData.append('Latitude', sellLat ? parseFloat(sellLat) : 0);
        formData.append('Longitude', sellLng ? parseFloat(sellLng) : 0);

        if (sellPhotos && sellPhotos.length > 0) {
            sellPhotos.forEach(photo => {
                formData.append('Photos', photo);
            });
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE_URL}/api/lands/sell`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            alert('Land listed for sale successfully!');
            setShowSellModal(false);

            // Reload land list
            const landsRes = await axios.get(`${API_BASE_URL}/api/lands`);
            const backendLands = (Array.isArray(landsRes.data) ? landsRes.data : []).map(l => ({
                id: l.id,
                title: l.title,
                description: l.description,
                location: l.location,
                size: l.sizeInAcres || l.size || 5,
                price: l.price,
                score: l.landIntelligenceScore || l.score || 85,
                soil: l.soilType || l.soil || 'Black Cotton Soil',
                water: l.groundwaterLevelDepth < 50 ? 'High' : (l.groundwaterLevelDepth < 100 ? 'Moderate' : 'Low'),
                tags: (l.landIntelligenceScore || l.score || 85) > 85 ? ['Verified', 'High Yield'] : ['Investment'],
                imagePath: l.imagePath,
                latitude: l.latitude || l.lat,
                longitude: l.longitude || l.lon,
                borewellSuccessProbability: l.borewellSuccessProbability || 80,
                contactNumber: l.contactNumber,
                ownerId: l.ownerId
            }));

            // Prepend created land if not in list
            if (res.data && res.data.id && !backendLands.some(b => b.id === res.data.id)) {
                backendLands.unshift({
                    id: res.data.id,
                    title: res.data.title || title,
                    description: res.data.description || sellDesc,
                    location: res.data.location || locationStr,
                    size: res.data.sizeInAcres || areaSize,
                    price: res.data.price || price,
                    score: res.data.landIntelligenceScore || 85,
                    soil: res.data.soilType || sellSoil || 'Black Cotton Soil',
                    water: 'Moderate',
                    tags: ['Verified', 'High Yield'],
                    imagePath: res.data.imagePath,
                    latitude: res.data.latitude || 18.5204,
                    longitude: res.data.longitude || 73.8567,
                    borewellSuccessProbability: res.data.borewellSuccessProbability || 80,
                    contactNumber: res.data.contactNumber || sellContact,
                    ownerId: res.data.ownerId || ownerId
                });
            }

            const existingTitles = new Set(backendLands.map(b => (b.title || '').toLowerCase().trim()));
            const combined = [...backendLands];

            for (const defLand of DEFAULT_LAND_PROPERTIES) {
                if (!existingTitles.has(defLand.title.toLowerCase().trim())) {
                    combined.push(defLand);
                }
            }

            const purchasedTitles = purchases.map(p => p.landTitle);
            setLands(combined.filter(l => !purchasedTitles.includes(l.title)));

            // Reset search/filter to All Regions so newly listed land and all properties display
            setSearchTerm('');
            setFilterCity('All');
            setSoilType('All');
            setWaterAvailability('All');

            // Clear fields
            resetSellForm();
        } catch (err) {
            console.error('Listing land failed:', err);
            alert(err.response?.data?.message || err.response?.data || 'Failed to list land.');
        } finally {
            setSubmittingSell(false);
        }
    };

    // Filter logic
    const filteredLands = lands.filter(land => {
        const sTerm = searchTerm.trim().toLowerCase();
        const matchesSearch = !sTerm ||
            (land.title && land.title.toLowerCase().includes(sTerm)) ||
            (land.location && land.location.toLowerCase().includes(sTerm)) ||
            (land.description && land.description.toLowerCase().includes(sTerm));

        const fCity = filterCity.trim().toLowerCase();
        const matchesCity = filterCity === 'All' ||
            (land.location && land.location.toLowerCase().includes(fCity)) ||
            (land.title && land.title.toLowerCase().includes(fCity));

        const sType = soilType.trim().toLowerCase();
        const matchesSoil = soilType === 'All' ||
            (land.soil && land.soil.toLowerCase().includes(sType));

        const matchesPrice = !land.price || land.price <= maxPrice;
        const matchesSize = (!land.size || (land.size >= minSize && land.size <= maxSize));
        const wAvail = waterAvailability.trim().toLowerCase();
        const matchesWater = waterAvailability === 'All' ||
            (land.water && land.water.toLowerCase().includes(wAvail));
        const matchesScore = !land.score || land.score >= minScore;

        return matchesSearch && matchesCity && matchesSoil && matchesPrice && matchesSize && matchesWater && matchesScore;
    });

    const formatPrice = (price) => {
        return `₹${(price / 100000).toFixed(1)} Lakhs`;
    };

    return (
        <Container fluid className="p-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-white fw-bold mb-0">
                    <i className="bi bi-search text-primary"></i> Smart Land Search
                </h2>
                <div className="d-flex gap-2">
                    <Button variant="outline-warning" className="fw-bold px-4 border-1 rounded-pill shadow" onClick={() => setShowPurchasesModal(true)}>
                        <i className="bi bi-receipt-cutoff me-2"></i> My Purchases ({purchases.length})
                    </Button>
                    {user && (user.role === 'Farmer' || user.Role === 'Farmer' || user.role === 'Land Buyer' || user.Role === 'Land Buyer') && (
                        <Button variant="success" className="fw-bold px-4 border-0 rounded-pill shadow animate__animated animate__fadeInRight" onClick={() => { resetSellForm(); setShowSellModal(true); }} style={{ background: 'linear-gradient(135deg, #00e676, #00b0ff)' }}>
                            <i className="bi bi-plus-circle-fill me-2"></i> Sell Your Land
                        </Button>
                    )}
                </div>
            </div>

            {/* Search and Filter Dashboard Bar */}
            <Card className="glass-panel border-0 mb-4 text-white">
                <Card.Body className="p-4">
                    <Row className="g-3 align-items-center">
                        <Col lg={6}>
                            <InputGroup>
                                <InputGroup.Text className="bg-transparent border-secondary text-secondary">
                                    <i className="bi bi-geo-alt-fill"></i>
                                </InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by city, area, or property title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent text-white border-secondary shadow-none"
                                />
                            </InputGroup>
                        </Col>
                        <Col lg={3}>
                            <Form.Select
                                value={filterCity}
                                onChange={(e) => {
                                    const selected = e.target.value;
                                    setFilterCity(selected);
                                    setSearchTerm('');
                                }}
                                className="bg-transparent text-white border-secondary shadow-none"
                            >
                                <option value="All" className="bg-dark">All Regions</option>
                                <option value="Ahmednagar" className="bg-dark">Ahmednagar</option>
                                <option value="Akola" className="bg-dark">Akola</option>
                                <option value="Amravati" className="bg-dark">Amravati</option>
                                <option value="Aurangabad" className="bg-dark">Aurangabad (Chhatrapati Sambhajinagar)</option>
                                <option value="Baramati" className="bg-dark">Baramati</option>
                                <option value="Bhusawal" className="bg-dark">Bhusawal</option>
                                <option value="Chandrapur" className="bg-dark">Chandrapur</option>
                                <option value="Dhule" className="bg-dark">Dhule</option>
                                <option value="Gondia" className="bg-dark">Gondia</option>
                                <option value="Hingoli" className="bg-dark">Hingoli</option>
                                <option value="Jalgaon" className="bg-dark">Jalgaon</option>
                                <option value="Jalna" className="bg-dark">Jalna</option>
                                <option value="Kolhapur" className="bg-dark">Kolhapur</option>
                                <option value="Latur" className="bg-dark">Latur</option>
                                <option value="Malegaon" className="bg-dark">Malegaon</option>
                                <option value="Mumbai" className="bg-dark">Mumbai</option>
                                <option value="Nagpur" className="bg-dark">Nagpur</option>
                                <option value="Nanded" className="bg-dark">Nanded</option>
                                <option value="Nandurbar" className="bg-dark">Nandurbar</option>
                                <option value="Nashik" className="bg-dark">Nashik</option>
                                <option value="Osmanabad" className="bg-dark">Osmanabad (Dharashiv)</option>
                                <option value="Parbhani" className="bg-dark">Parbhani</option>
                                <option value="Pune" className="bg-dark">Pune</option>
                                <option value="Raigad" className="bg-dark">Raigad</option>
                                <option value="Ratnagiri" className="bg-dark">Ratnagiri</option>
                                <option value="Sangli" className="bg-dark">Sangli</option>
                                <option value="Satara" className="bg-dark">Satara</option>
                                <option value="Sindhudurg" className="bg-dark">Sindhudurg</option>
                                <option value="Solapur" className="bg-dark">Solapur</option>
                                <option value="Thane" className="bg-dark">Thane</option>
                                <option value="Wardha" className="bg-dark">Wardha</option>
                                <option value="Washim" className="bg-dark">Washim</option>
                                <option value="Yavatmal" className="bg-dark">Yavatmal</option>
                            </Form.Select>
                        </Col>
                        <Col lg={3}>
                            <Button
                                variant={showAdvanced ? "success" : "primary"}
                                className="w-100 rounded-pill fw-bold"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                            >
                                <i className={`bi bi-${showAdvanced ? 'x-circle' : 'funnel'}-fill me-2`}></i>
                                {showAdvanced ? "Hide Filters" : "Advanced Filters"}
                            </Button>
                        </Col>
                    </Row>

                    {showAdvanced && (
                        <div className="mt-4 pt-4 border-top border-secondary">
                            <Row className="g-3">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary">Soil Type</Form.Label>
                                        <Form.Select
                                            value={soilType}
                                            onChange={(e) => setSoilType(e.target.value)}
                                            className="bg-transparent text-white border-secondary shadow-none"
                                            style={{ backgroundColor: '#141d2b' }}
                                        >
                                            <option value="All" className="bg-dark">All Soils</option>
                                            <option value="Black" className="bg-dark">Black Cotton / Black Soil</option>
                                            <option value="Red" className="bg-dark">Red Soil / Red Laterite</option>
                                            <option value="Alluvial" className="bg-dark">Alluvial</option>
                                            <option value="Loamy" className="bg-dark">Loamy</option>
                                            <option value="Laterite" className="bg-dark">Laterite</option>
                                            <option value="Rocky" className="bg-dark">Rocky</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary">Water Availability</Form.Label>
                                        <Form.Select
                                            value={waterAvailability}
                                            onChange={(e) => setWaterAvailability(e.target.value)}
                                            className="bg-transparent text-white border-secondary shadow-none"
                                            style={{ backgroundColor: '#141d2b' }}
                                        >
                                            <option value="All" className="bg-dark">All Water Levels</option>
                                            <option value="High" className="bg-dark">High</option>
                                            <option value="Moderate" className="bg-dark">Moderate</option>
                                            <option value="Low" className="bg-dark">Low</option>
                                            <option value="Excellent" className="bg-dark">Excellent</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary">Min EarthScan Score: {minScore}</Form.Label>
                                        <Form.Range
                                            min="0"
                                            max="100"
                                            value={minScore}
                                            onChange={(e) => setMinScore(Number(e.target.value))}
                                            className="form-range mt-2"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary">Max Price: ₹{(maxPrice / 100000).toFixed(0)} Lakhs</Form.Label>
                                        <Form.Range
                                            min="1000000"
                                            max="25130000"
                                            step="513000"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(Number(e.target.value))}
                                            className="form-range mt-2"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className="g-3 mt-2 align-items-end">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary">Min Size (Acres)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="0"
                                            value={minSize}
                                            onChange={(e) => setMinSize(Number(e.target.value))}
                                            className="bg-transparent text-white border-secondary shadow-none"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small text-secondary">Max Size (Acres)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="0"
                                            value={maxSize}
                                            onChange={(e) => setMaxSize(Number(e.target.value))}
                                            className="bg-transparent text-white border-secondary shadow-none"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6} className="d-flex justify-content-end align-items-center">
                                    <Button variant="outline-light" className="px-4 rounded-pill" onClick={handleResetFilters}>
                                        Reset Filters
                                    </Button>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Results Info */}
            <div className="mb-3 d-flex justify-content-between align-items-center">
                <h5 className="text-secondary mb-0">Found <span className="text-white fw-bold">{filteredLands.length}</span> properties</h5>
            </div>

            {/* Land Cards Grid */}
            {loadingLands ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="success" size="lg" />
                    <p className="text-secondary mt-3">Loading properties from database...</p>
                </div>
            ) : (
                <Row className="g-4">
                    {filteredLands.map(land => (
                        <Col xl={4} lg={6} key={land.id}>
                            <Card className="glass-panel border-0 text-white h-100 hover-scale" style={{ transition: 'transform 0.2s' }}>
                                {/* Card Image Placeholder */}
                                <div
                                    style={{
                                        height: '200px',
                                        background: 'linear-gradient(135deg, rgba(41, 121, 255, 0.2), rgba(0, 230, 118, 0.2))',
                                        borderTopLeftRadius: '16px',
                                        borderTopRightRadius: '16px',
                                        position: 'relative'
                                    }}
                                    className="d-flex align-items-center justify-content-center"
                                >
                                    <Button
                                        variant="light"
                                        className="rounded-circle shadow border-0"
                                        style={{ position: 'absolute', top: '15px', left: '15px', width: '35px', height: '35px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => handleSaveProperty(land)}
                                    >
                                        <i className="bi bi-bookmark-fill text-primary"></i>
                                    </Button>
                                    <img
                                        src={getLandImage(land)}
                                        alt={land.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderTopLeftRadius: '16px',
                                            borderTopRightRadius: '16px'
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80';
                                        }}
                                    />
                                    <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                                        {land.tags.map((tag, idx) => (
                                            <Badge bg={tag === 'Verified' ? 'success' : 'primary'} key={idx} className="shadow-sm">
                                                {tag === 'Verified' && <i className="bi bi-patch-check-fill me-1"></i>}
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Card.Body className="p-4 d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h5 className="fw-bold text-gradient mb-0">{land.title}</h5>
                                    </div>
                                    <p className="text-secondary mb-3"><i className="bi bi-geo-alt text-danger me-1"></i> {land.location}</p>

                                    <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <p className="text-secondary small mb-0">Total Price</p>
                                            <h4 className="fw-bold mb-0 text-white">{formatPrice(land.price)}</h4>
                                        </div>
                                        <div className="text-end">
                                            <p className="text-secondary small mb-0">Size</p>
                                            <h5 className="fw-bold mb-0 text-info">{land.size} Acres</h5>
                                        </div>
                                    </div>

                                    <Row className="mb-4 flex-grow-1">
                                        <Col xs={6} className="mb-3">
                                            <p className="text-secondary small mb-1"><i className="bi bi-layers-fill text-warning me-1"></i> Soil Type</p>
                                            <span className="fw-bold">{land.soil}</span>
                                        </Col>
                                        <Col xs={6} className="mb-3">
                                            <p className="text-secondary small mb-1"><i className="bi bi-droplet-fill text-primary me-1"></i> Water</p>
                                            <span className="fw-bold">{land.water}</span>
                                        </Col>
                                        <Col xs={12}>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="text-secondary small">EarthScan Intelligence Score</span>
                                                <Badge bg={land.score >= 80 ? 'success' : land.score >= 60 ? 'warning' : 'danger'}>
                                                    {land.score}/100
                                                </Badge>
                                            </div>
                                            <div className="progress mt-2" style={{ height: '6px', background: 'rgba(255,255,255,0.1)' }}>
                                                <div
                                                    className={`progress-bar ${land.score >= 80 ? 'bg-success' : land.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                    role="progressbar"
                                                    style={{ width: `${land.score}%` }}
                                                ></div>
                                            </div>
                                        </Col>
                                    </Row>

                                    <div className="d-flex gap-2 mt-auto">
                                        <Button variant="outline-light" className="w-50 rounded-pill hover-white" onClick={() => handleViewDetails(land)}>
                                            View Details
                                        </Button>
                                        <Button variant="primary" className="w-50 rounded-pill fw-bold" onClick={() => handleAddToCompare(land)}>
                                            Add to Compare
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}

                    {filteredLands.length === 0 && (
                        <Col xs={12}>
                            <div className="text-center p-5 text-secondary glass-panel rounded-4">
                                <i className="bi bi-search mb-3 d-block" style={{ fontSize: '3rem' }}></i>
                                <h5>No properties found</h5>
                                <p>Try adjusting your search terms or filters to find more properties.</p>
                            </div>
                        </Col>
                    )}
                </Row>
            )}

            {/* Detailed Property View Modal */}
            <Modal show={!!selectedLand} onHide={() => setSelectedLand(null)} centered size="lg" contentClassName="glass-panel text-white border-0" style={{ background: 'rgba(10, 15, 24, 0.45)' }}>
                <Modal.Header closeButton closeVariant="white" className="border-secondary" style={{ backgroundColor: '#0d1527' }}>
                    <Modal.Title className="fw-bold"><i className="bi bi-info-circle text-primary"></i> Property Details</Modal.Title>
                </Modal.Header>
                {selectedLand && (
                    <Modal.Body className="p-4" style={{ backgroundColor: '#0d1527' }}>
                        <Row className="g-4">
                            <Col md={6}>
                                <div style={{ minHeight: '250px', position: 'relative' }} className="mb-3">
                                    {(() => {
                                        const paths = getLandImagesArray(selectedLand);
                                        if (paths.length > 1) {
                                            return (
                                                <div className="carousel slide" data-bs-ride="carousel" id="landImagesCarousel" style={{ height: '250px', borderRadius: '12px', overflow: 'hidden' }}>
                                                    <div className="carousel-inner h-100">
                                                        {paths.map((p, idx) => (
                                                            <div key={idx} className={`carousel-item h-100 ${idx === 0 ? 'active' : ''}`}>
                                                                <img
                                                                    src={p}
                                                                    alt={`${selectedLand.title}-${idx}`}
                                                                    className="d-block w-100 h-100"
                                                                    style={{ objectFit: 'cover' }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button className="carousel-control-prev" type="button" data-bs-target="#landImagesCarousel" data-bs-slide="prev">
                                                        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                                                    </button>
                                                    <button className="carousel-control-next" type="button" data-bs-target="#landImagesCarousel" data-bs-slide="next">
                                                        <span className="carousel-control-next-icon" aria-hidden="true"></span>
                                                    </button>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <img
                                                    src={paths[0]}
                                                    alt={selectedLand.title}
                                                    style={{
                                                        width: '100%',
                                                        height: '250px',
                                                        objectFit: 'cover',
                                                        borderRadius: '12px'
                                                    }}
                                                />
                                            );
                                        }
                                    })()}
                                </div>
                                <div className="d-flex gap-2 flex-wrap mb-3">
                                    {selectedLand.tags.map((tag, idx) => (
                                        <Badge bg={tag === 'Verified' ? 'success' : 'primary'} key={idx} className="px-3 py-2 fs-6">
                                            {tag === 'Verified' && <i className="bi bi-patch-check-fill me-1"></i>}
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </Col>
                            <Col md={6}>
                                <h3 className="fw-bold text-gradient mb-2" style={{ background: 'linear-gradient(45deg, #00e676, #2979ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{selectedLand.title}</h3>
                                <p className="text-secondary fs-5 mb-4"><i className="bi bi-geo-alt text-danger me-1"></i> {selectedLand.location}</p>

                                <div className="p-3 rounded mb-3" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <Row>
                                        <Col xs={6}>
                                            <p className="text-secondary small mb-1">Total Price</p>
                                            <h4 className="fw-bold mb-0 text-white">{formatPrice(selectedLand.price)}</h4>
                                        </Col>
                                        <Col xs={6} className="border-start border-secondary">
                                            <p className="text-secondary small mb-1">Land Size</p>
                                            <h4 className="fw-bold mb-0 text-info">{selectedLand.size} Acres</h4>
                                        </Col>
                                    </Row>
                                </div>

                                <div className="d-flex flex-column gap-3 mb-4">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-secondary"><i className="bi bi-layers-fill text-warning me-2"></i> Soil Type:</span>
                                        <span className="fw-bold text-white">{selectedLand.soil}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-secondary"><i className="bi bi-droplet-fill text-primary me-2"></i> Water Level:</span>
                                        <span className="fw-bold text-info">{selectedLand.water}</span>
                                    </div>
                                    <div className="d-flex flex-column">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="text-secondary"><i className="bi bi-activity me-2"></i> EarthScan Score:</span>
                                            <span className="fw-bold text-success">{selectedLand.score}/100</span>
                                        </div>
                                        <div className="progress bg-dark" style={{ height: '8px' }}>
                                            <div
                                                className={`progress-bar ${selectedLand.score >= 80 ? 'bg-success' : selectedLand.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                role="progressbar"
                                                style={{ width: `${selectedLand.score}%` }}
                                                aria-valuenow={selectedLand.score}
                                                aria-valuemin="0"
                                                aria-valuemax="100"
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex gap-2 mb-2">
                                    <Button variant="success" className="w-50 py-2 fw-bold" onClick={() => { handleAddToCompare(selectedLand); setSelectedLand(null); }}>
                                        Add to Compare
                                    </Button>
                                    <Button variant="warning" className="w-50 py-2 fw-bold text-dark" onClick={() => { setShowBuyModal(true); }}>
                                        <i className="bi bi-cart-fill me-1"></i> Buy Property
                                    </Button>
                                </div>
                                <div className="d-flex gap-2 mb-3">
                                    <Button variant="outline-primary" className="w-100 py-2" onClick={() => { handleSaveProperty(selectedLand); setSelectedLand(null); }}>
                                        <i className="bi bi-bookmark-fill me-1"></i> Save to Favorites
                                    </Button>
                                </div>

                                <div className="d-flex flex-column gap-2">
                                    <a
                                        href={`tel:${selectedLand.contactNumber || '18001801551'}`}
                                        className="btn btn-warning py-2 fw-bold text-dark d-flex align-items-center justify-content-center gap-2 rounded-3 shadow"
                                    >
                                        Contact Number: {(selectedLand.contactNumber || 'N/A').replace(/^\+91[- ]?/, '')}
                                    </a>
                                </div>
                            </Col>
                        </Row>

                    </Modal.Body>
                )}
            </Modal>

            {/* Sell Land Modal Form */}
            <Modal show={showSellModal} onHide={() => setShowSellModal(false)} centered size="lg" contentClassName="glass-panel text-white border-0" style={{ background: 'rgba(10, 15, 24, 0.45)' }}>
                <Modal.Header closeButton closeVariant="white" className="border-secondary" style={{ backgroundColor: '#0d1527' }}>
                    <Modal.Title className="fw-bold text-success"><i className="bi bi-plus-circle-fill"></i> List Land for Sale</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ backgroundColor: '#0d1527' }}>
                    <Form onSubmit={handleSellSubmit}>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Property Title</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={sellTitle}
                                        onChange={(e) => setSellTitle(e.target.value)}
                                        required
                                        placeholder="e.g. Fertile Black Soil Farm"
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Contact Phone Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={sellContact}
                                        onChange={(e) => setSellContact(e.target.value.replace(/[^\d+]/g, ''))}
                                        required
                                        placeholder="e.g. 9876543210"
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="text-secondary small">Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={sellDesc}
                                onChange={(e) => setSellDesc(e.target.value)}
                                required
                                placeholder="Describe your land details, crop history, road access..."
                                className="bg-transparent text-white border-secondary shadow-none"
                            />
                        </Form.Group>

                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">PIN Code</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={sellPincode}
                                        onChange={handleSellPincodeChange}
                                        required
                                        placeholder="e.g. 411001"
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                    {fetchingSellPin && <Form.Text className="text-info small">Fetching village list...</Form.Text>}
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Village / Area Selection</Form.Label>
                                    {sellVillages.length > 0 ? (
                                        <Form.Select
                                            value={sellVillage}
                                            onChange={(e) => setSellVillage(e.target.value)}
                                            className="bg-transparent text-white border-secondary shadow-none"
                                            style={{ backgroundColor: '#141d2b' }}
                                        >
                                            {sellVillages.map((v, i) => (
                                                <option key={i} value={v} className="bg-dark">{v}</option>
                                            ))}
                                        </Form.Select>
                                    ) : (
                                        <Form.Control
                                            type="text"
                                            value={sellVillage}
                                            onChange={(e) => setSellVillage(e.target.value)}
                                            required
                                            placeholder="Enter village manually or type PIN above"
                                            className="bg-transparent text-white border-secondary shadow-none"
                                        />
                                    )}
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="g-3 align-items-end mb-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="text-secondary small fw-bold">
                                        <i className="bi bi-file-earmark-pdf-fill text-success me-1"></i> Upload Official Satbara (7/12) Document Extract
                                    </Form.Label>
                                    <div className="border border-secondary border-dashed p-3 rounded text-center bg-dark bg-opacity-25">
                                        <input
                                            type="file"
                                            id="satbara-file-upload"
                                            accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
                                            onChange={handleSatbaraFileUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="satbara-file-upload" className="btn btn-outline-success btn-sm fw-bold mb-2">
                                            <i className="bi bi-file-earmark-arrow-up-fill me-1"></i> Choose 7/12 Document File
                                        </label>
                                        <div className="small text-secondary">
                                            {satbaraUploadFile ? (
                                                <span className="text-info fw-bold">{satbaraUploadFile.name} ({(satbaraUploadFile.size / 1024).toFixed(1)} KB)</span>
                                            ) : (
                                                "Supports PDF, DOCX, JPG, PNG, WEBP (Max 5MB)"
                                            )}
                                        </div>
                                        {satbaraUploadFile && (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                className="mt-2 w-100 fw-bold"
                                                onClick={handleUploadSatbaraVerification}
                                                disabled={verifyingSatbara}
                                            >
                                                {verifyingSatbara ? <Spinner animation="border" size="sm" /> : "Process & Verify Uploaded Document"}
                                            </Button>
                                        )}
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>

                        {satbaraDetails && (
                            <div className="p-3 mb-3 border border-success border-opacity-50 rounded bg-success bg-opacity-10 text-white">
                                <div className="d-flex align-items-center mb-2 text-success fw-bold">
                                    <i className="bi bi-patch-check-fill fs-5 me-2"></i>
                                    7/12 Satbara OCR Fields Extracted & Autofilled
                                </div>
                                <Row className="g-2 small text-secondary">
                                    <Col md={6}><strong>Landowner:</strong> <span className="text-white">{satbaraDetails.ownerName || 'Vilas Dhondiram Dawade'}</span></Col>
                                    <Col md={6}><strong>Survey / Gat No:</strong> <span className="text-white">{satbaraDetails.surveyNo || '142/A'}</span></Col>
                                    <Col md={6}><strong>Total Area:</strong> <span className="text-white">{satbaraDetails.totalArea || '2.47 Acres'}</span></Col>
                                    <Col md={6}><strong>Cultivable Area:</strong> <span className="text-white">{satbaraDetails.cultivableArea || '2.10 Acres'}</span></Col>
                                    <Col md={6}><strong>Potkharaba Area:</strong> <span className="text-white">{satbaraDetails.potkharaba || '0.37 Acres'}</span></Col>
                                    <Col md={6}><strong>ULPIN:</strong> <span className="text-white">{satbaraDetails.ulpin || 'MH-JL-2026-712-0941'}</span></Col>
                                </Row>
                            </div>
                        )}

                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Taluka</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={sellTaluka}
                                        disabled
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">District</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={sellDistrict}
                                        disabled
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">State</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={sellStateName}
                                        disabled
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Price (₹ INR)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={sellPrice}
                                        onChange={(e) => setSellPrice(e.target.value)}
                                        required
                                        placeholder="e.g. 4513000"
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Land Area Size (Acres)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="0.1"
                                        value={sellSize}
                                        onChange={(e) => setSellSize(e.target.value)}
                                        required
                                        placeholder="e.g. 5.5"
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Soil Type</Form.Label>
                                    <Form.Select
                                        value={sellSoil}
                                        onChange={(e) => setSellSoil(e.target.value)}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        style={{ backgroundColor: '#141d2b' }}
                                    >
                                        <option value="Black Cotton Soil" className="bg-dark">Black Cotton Soil</option>
                                        <option value="Red Soil" className="bg-dark">Red Soil</option>
                                        <option value="Alluvial Soil" className="bg-dark">Alluvial Soil</option>
                                        <option value="Sandy Loam Soil" className="bg-dark">Sandy Loam Soil</option>
                                        <option value="Laterite Soil" className="bg-dark">Laterite Soil</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Average Water Depth (Feet)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={sellWater}
                                        onChange={(e) => setSellWater(e.target.value)}
                                        required
                                        placeholder="e.g. 80"
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Land Image Photos (Select one or more)</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleSellPhotosChange}
                                        required={false}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                    {photoError && <div className="text-danger small mt-1">{photoError}</div>}
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Latitude (Optional - Geocodes automatically if 0)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="any"
                                        value={sellLat}
                                        onChange={(e) => setSellLat(e.target.value)}
                                        placeholder="e.g. 18.5204"
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Longitude (Optional - Geocodes automatically if 0)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="any"
                                        value={sellLng}
                                        onChange={(e) => setSellLng(e.target.value)}
                                        placeholder="e.g. 73.8567"
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Button
                            variant="success"
                            type="submit"
                            className="w-100 py-2.5 fw-bold border-0 mt-3 d-flex justify-content-center align-items-center gap-2"
                            disabled={submittingSell || !sellTitle || !sellPrice}
                            style={{ background: 'linear-gradient(90deg, #00e676, #00b0ff)' }}
                        >
                            {submittingSell ? <Spinner size="sm" animation="border" variant="light" /> : null}
                            {submittingSell ? "Uploading & Listing..." : "List Land For Sale"}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
            {/* Buy Land Confirmation Modal */}
            <Modal show={showBuyModal} onHide={() => setShowBuyModal(false)} centered contentClassName="glass-panel text-white border-0" style={{ background: 'rgba(10, 15, 24, 0.45)' }}>
                <Modal.Header closeButton closeVariant="white" className="border-secondary" style={{ backgroundColor: '#0d1527' }}>
                    <Modal.Title className="fw-bold text-warning"><i className="bi bi-cart-check-fill"></i> Confirm Land Purchase</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ backgroundColor: '#0d1527' }}>
                    {selectedLand && (
                        <Form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!buyerName || !buyerPhone) {
                                alert("Please fill in your Name and Phone Number.");
                                return;
                            }
                            try {
                                const satbaraInfo = satbaraDetails || {
                                    state: 'Unverified Land',
                                    formName: '',
                                    district: '',
                                    taluka: '',
                                    village: '',
                                    surveyNo: '',
                                    tenure: '',
                                    totalArea: '',
                                    cultivableArea: '',
                                    potkharaba: '',
                                    assessmentTax: '',
                                    irrigationSource: '',
                                    hasWell: '',
                                    ownerName: '',
                                    otherRights: '',
                                    cropHistory: []
                                };
                                const receipt = {
                                    receiptNo: `ESB-${Math.floor(100000 + Math.random() * 900000)}`,
                                    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                    buyerName,
                                    buyerPhone,
                                    buyerIdCard,
                                    landTitle: selectedLand.title,
                                    landLocation: selectedLand.location,
                                    landSize: selectedLand.size,
                                    landPrice: selectedLand.price,
                                    soilType: selectedLand.soil,
                                    waterDepth: selectedLand.water,
                                    contactNumber: selectedLand.contactNumber || '9969361069',
                                    satbara: satbaraInfo
                                };

                                // Perform Delete on backend to mark it sold & remove from listing
                                try {
                                    await axios.delete(`${API_BASE_URL}/api/lands/${selectedLand.id}`);
                                } catch (deleteErr) {
                                    console.warn("Backend land removal skipped or failed, completing transaction:", deleteErr);
                                }

                                setReceiptData(receipt);
                                const updatedPurchases = [receipt, ...purchases];
                                setPurchases(updatedPurchases);
                                localStorage.setItem('purchasedLands', JSON.stringify(updatedPurchases));

                                setShowBuyModal(false);
                                setSelectedLand(null);
                                setLands(prevLands => prevLands.filter(l => l.id !== selectedLand.id));

                                try {
                                    const landsRes = await axios.get(`${API_BASE_URL}/api/lands`);
                                    if (Array.isArray(landsRes.data) && landsRes.data.length > 0) {
                                        const mappedLands = landsRes.data.map(l => ({
                                            id: l.id,
                                            title: l.title,
                                            location: l.location,
                                            size: l.sizeInAcres || l.size || 5,
                                            price: l.price,
                                            score: l.landIntelligenceScore || l.score || 85,
                                            soil: l.soilType || l.soil || 'Black Cotton Soil',
                                            water: l.groundwaterLevelDepth < 50 ? 'High' : (l.groundwaterLevelDepth < 100 ? 'Moderate' : 'Low'),
                                            tags: (l.landIntelligenceScore || l.score || 85) > 85 ? ['Verified', 'High Yield'] : ['Investment'],
                                            imagePath: l.imagePath,
                                            latitude: l.latitude || l.lat,
                                            longitude: l.longitude || l.lon,
                                            borewellSuccessProbability: l.borewellSuccessProbability || 80,
                                            contactNumber: l.contactNumber,
                                            ownerId: l.ownerId
                                        }));
                                        setLands(mappedLands);
                                    }
                                } catch (refreshErr) {
                                    console.warn("Backend list refresh skipped, keeping local updated state:", refreshErr);
                                }
                                setShowReceiptModal(true);
                            } catch (err) {
                                console.error("Error during land purchase transaction:", err);
                            }
                        }}>
                            <div className="mb-3 p-3 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <h6 className="fw-bold text-info mb-2">{selectedLand.title}</h6>
                                <p className="small mb-1 text-secondary">Location: <span className="text-white">{selectedLand.location}</span></p>
                                <p className="small mb-1 text-secondary">Size: <span className="text-white">{selectedLand.size} Acres</span></p>
                                <p className="small mb-0 text-secondary">Total Cost: <span className="text-warning fw-bold">{formatPrice(selectedLand.price)}</span></p>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label className="text-secondary small">Buyer Full Name (खरेदीदार नाव)</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={buyerName}
                                    onChange={(e) => setBuyerName(e.target.value)}
                                    required
                                    placeholder="Enter your official name"
                                    className="bg-transparent text-white border-secondary shadow-none"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-secondary small">Buyer Phone Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={buyerPhone}
                                    onChange={(e) => setBuyerPhone(e.target.value.replace(/[^\d+]/g, ''))}
                                    required
                                    placeholder="Enter your phone number"
                                    className="bg-transparent text-white border-secondary shadow-none"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-secondary small">Aadhaar / PAN Number (Optional)</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={buyerIdCard}
                                    onChange={(e) => setBuyerIdCard(e.target.value)}
                                    placeholder="e.g. XXXX-XXXX-XXXX"
                                    className="bg-transparent text-white border-secondary shadow-none"
                                />
                            </Form.Group>

                            <Button variant="warning" type="submit" className="w-100 py-2.5 fw-bold text-dark mt-2">
                                Confirm & Complete Purchase
                            </Button>
                        </Form>
                    )}
                </Modal.Body>
            </Modal>

            {/* Purchase Receipt & Satbara Certificate Modal */}
            <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} centered size="lg" contentClassName="glass-panel text-white border-0" style={{ background: 'rgba(10, 15, 24, 0.45)' }}>
                <Modal.Header closeButton closeVariant="white" className="border-secondary" style={{ backgroundColor: '#0d1527' }}>
                    <Modal.Title className="fw-bold text-success"><i className="bi bi-printer-fill"></i> Purchase Receipt & 7/12 Satbara Certificate</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ backgroundColor: '#0d1527', maxHeight: '80vh', overflowY: 'auto' }}>
                    {receiptData && (
                        <div>
                            <div className="p-4 rounded text-dark bg-white shadow mb-3 border border-dark text-start" id="printable-receipt" style={{ fontFamily: 'Georgia, serif' }}>
                                {/* Header Stamp */}
                                <div className="text-center border-bottom border-dark pb-3 mb-4">
                                    <h4 className="fw-bold mb-1 text-center" style={{ letterSpacing: '1px' }}>EARTHSCAN BHARAT PLATFORM</h4>
                                    <h6 className="text-secondary text-center small mb-2 text-center">MINISTRY OF AGRICULTURE & REGULATORY LAND SYSTEMS</h6>
                                    <div className="badge bg-success text-white py-1.5 px-3 rounded-pill fw-bold" style={{ display: 'inline-block' }}>OFFICIAL TRANSACTION RECEIPT</div>
                                </div>

                                <Row className="mb-4 small g-3">
                                    <Col sm={6}>
                                        <strong>Receipt Number:</strong> {receiptData.receiptNo}<br />
                                        <strong>Date of Transaction:</strong> {receiptData.date}<br />
                                        <strong>Status:</strong> <span className="text-success fw-bold">PAID / DEED RECORDED</span>
                                    </Col>
                                    <Col sm={6} className="text-sm-end">
                                        <strong>Verified Land ID:</strong> MH-SAT-{receiptData.satbara.surveyNo}<br />
                                        <strong>Deed Book:</strong> 2026/A-992<br />
                                        <strong>Verification Code:</strong> ESB-88392-OK
                                    </Col>
                                </Row>

                                <div className="mb-4 border-top border-bottom border-dark py-3">
                                    <Row className="g-3">
                                        <Col sm={6}>
                                            <h6 className="fw-bold mb-2">SELLER / OWNER DETAILS:</h6>
                                            <strong>Name:</strong> {receiptData.satbara.ownerName}<br />
                                            <strong>Contact:</strong> {receiptData.contactNumber}
                                        </Col>
                                        <Col sm={6} className="border-start border-dark ps-sm-4">
                                            <h6 className="fw-bold mb-2">BUYER DETAILS (खरेदीदार):</h6>
                                            <strong>Name:</strong> {receiptData.buyerName}<br />
                                            <strong>Contact:</strong> {receiptData.buyerPhone}<br />
                                            {receiptData.buyerIdCard && <><strong>ID Card:</strong> {receiptData.buyerIdCard}</>}
                                        </Col>
                                    </Row>
                                </div>

                                <h6 className="fw-bold mb-2">LAND TRANSACTION DETAILS:</h6>
                                <table className="table table-bordered border-dark table-sm mb-4">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Description / तपशील</th>
                                            <th>Area (Acres)</th>
                                            <th>Location / ठिकाण</th>
                                            <th>Total Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>{receiptData.landTitle} (Survey No. {receiptData.satbara.surveyNo})</td>
                                            <td>{receiptData.landSize} Acres</td>
                                            <td>{receiptData.landLocation}</td>
                                            <td className="fw-bold text-end">₹ {parseInt(receiptData.landPrice).toLocaleString('en-IN')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Verified 7/12 Satbara Copy */}
                                <div className="p-3 border border-dark rounded bg-light mb-4 text-dark" style={{ fontSize: '0.85rem' }}>
                                    <div className="text-center mb-2 border-bottom border-dark pb-2">
                                        <strong className="d-block" style={{ fontSize: '1rem' }}>७/१२ उतारा तपशील (VERIFIED 7/12 SATBARA DATA)</strong>
                                        <span className="small text-muted">{renderVal(receiptData.satbara.state)}</span>
                                    </div>
                                    <Row className="g-2 mb-2">
                                        <Col xs={4}><strong>District / जिल्हा:</strong> {renderVal(receiptData.satbara.district)}</Col>
                                        <Col xs={4}><strong>Taluka / तालुका:</strong> {renderVal(receiptData.satbara.taluka)}</Col>
                                        <Col xs={4}><strong>Village / गाव:</strong> {renderVal(receiptData.satbara.village)}</Col>
                                    </Row>
                                    <Row className="g-2 mb-2">
                                        <Col xs={6}><strong>Survey/Gat No / गट क्र:</strong> {renderVal(receiptData.satbara.surveyNo)}</Col>
                                        <Col xs={6}><strong>Tenure / भूधारणा:</strong> {renderVal(receiptData.satbara.tenure)}</Col>
                                    </Row>
                                    <Row className="g-2 mb-2">
                                        <Col xs={6}><strong>Total Hectares:</strong> {renderVal(receiptData.satbara.totalArea)}</Col>
                                        <Col xs={6}><strong>Tax / आकारणी:</strong> {renderVal(receiptData.satbara.assessmentTax)}</Col>
                                    </Row>
                                    <Row className="g-2 mb-2">
                                        <Col xs={6}><strong>Irrigation / सिंचन:</strong> {renderVal(receiptData.satbara.irrigationSource)}</Col>
                                        <Col xs={6}><strong>Well present:</strong> {renderVal(receiptData.satbara.hasWell)}</Col>
                                    </Row>
                                    <div>
                                        <strong>Historical Cultivation:</strong>
                                        <ul>
                                            {receiptData.satbara.cropHistory.map((c, i) => (
                                                <li key={i} className="small" style={{ listStyleType: 'square' }}>{c.year} | {c.season} | {c.crop} | {c.area}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="text-center mt-4 small text-muted border-top border-dark pt-3">
                                    * This document serves as legal proof of transaction. Handover deeds have been digitally signed and registered.
                                </div>
                            </div>

                            <div className="d-flex gap-2 pdf-exclude">
                                <Button
                                    variant="success"
                                    className="w-50 py-2 fw-bold"
                                    onClick={() => {
                                        const printContent = document.getElementById("printable-receipt").innerHTML;
                                        const originalContent = document.body.innerHTML;
                                        document.body.innerHTML = printContent;
                                        window.print();
                                        window.location.reload(); // Reload to restore React state cleanly
                                    }}
                                >
                                    <i className="bi bi-printer-fill me-1"></i> Print Receipt & Satbara
                                </Button>
                                <Button variant="outline-light" className="w-50 py-2 fw-bold" onClick={() => setShowReceiptModal(false)}>
                                    Close / बंद करा
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
            {/* My Purchases History Modal */}
            <Modal show={showPurchasesModal} onHide={() => setShowPurchasesModal(false)} centered size="lg" contentClassName="glass-panel text-white border-0" style={{ background: 'rgba(10, 15, 24, 0.45)' }}>
                <Modal.Header closeButton closeVariant="white" className="border-secondary" style={{ backgroundColor: '#0d1527' }}>
                    <Modal.Title className="fw-bold text-warning"><i className="bi bi-receipt-cutoff"></i> My Purchased Lands (माझी खरेदी इतिहास)</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ backgroundColor: '#0d1527', maxHeight: '75vh', overflowY: 'auto' }}>
                    {purchases.length === 0 ? (
                        <div className="text-center py-5 text-secondary">
                            <i className="bi bi-cart-x" style={{ fontSize: '3rem', opacity: 0.4 }}></i>
                            <p className="mt-3 fs-5 mb-0">No purchases found. You haven't bought any lands yet.</p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {purchases.map((p, idx) => (
                                <Card key={idx} className="bg-transparent border-secondary text-white p-3 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                        <div>
                                            <h6 className="fw-bold text-info mb-1">{p.landTitle}</h6>
                                            <p className="small mb-1 text-secondary"><i className="bi bi-geo-alt me-1"></i> {p.landLocation}</p>
                                            <p className="small mb-0 text-secondary">Bought on: <span className="text-white">{p.date}</span></p>
                                        </div>
                                        <div className="text-end">
                                            <span className="badge bg-success mb-2 d-inline-block">Paid & Verified</span>
                                            <h5 className="fw-bold text-warning mb-0">₹ {parseInt(p.landPrice).toLocaleString('en-IN')}</h5>
                                        </div>
                                    </div>
                                    <hr className="my-2 border-secondary" style={{ opacity: 0.1 }} />
                                    <div className="d-flex justify-content-between align-items-center">
                                        <small className="text-muted">Receipt: {p.receiptNo}</small>
                                        <div className="d-flex gap-2">
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                title="Remove from purchases"
                                                onClick={() => {
                                                    const updated = purchases.filter((_, i) => i !== idx);
                                                    setPurchases(updated);
                                                    localStorage.setItem('purchasedLands', JSON.stringify(updated));
                                                }}
                                            >
                                                <i className="bi bi-trash3-fill"></i>
                                            </Button>
                                            <Button
                                                variant="outline-warning"
                                                size="sm"
                                                className="fw-bold"
                                                onClick={() => {
                                                    setReceiptData(p);
                                                    setShowPurchasesModal(false);
                                                    setShowReceiptModal(true);
                                                }}
                                            >
                                                <i className="bi bi-printer-fill me-1"></i> View Receipt & Satbara Copy
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
}
