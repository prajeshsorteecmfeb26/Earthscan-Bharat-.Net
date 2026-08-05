import React, { useRef, useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Tabs, Tab } from 'react-bootstrap';
import InsightsFooter from '../components/InsightsFooter';
import html2pdf from 'html2pdf.js';
import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { AuthContext } from '../context/AuthContext';

export default function CropFertilizer() {
    const reportRef = useRef();
    const { t, i18n } = useTranslation();
    const { user } = useContext(AuthContext);
    const userId = user?.id || user?.Id || 0;

    // Crop Advisor parameters
    const [n, setN] = useState('');
    const [p, setP] = useState('');
    const [k, setK] = useState('');
    const [ph, setPh] = useState('');
    const [rainfall, setRainfall] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [recommendations, setRecommendations] = useState(null);

    // Soil PDF Upload state
    const [soilFile, setSoilFile] = useState(null);
    const [uploadingSoil, setUploadingSoil] = useState(false);

    // Disease AI detection state
    const [cropCategory, setCropCategory] = useState('Cotton');
    const [diseaseFile, setDiseaseFile] = useState(null);
    const [detectingDisease, setDetectingDisease] = useState(false);
    const [diseaseResult, setDiseaseResult] = useState(null);

    // Active tab
    const [activeTab, setActiveTab] = useState('advisor');

    // Search and dynamic Soil Report AI recommendations states
    const [cropSearch, setCropSearch] = useState('');
    const [soilReportResult, setSoilReportResult] = useState(null);

    // Load state from session storage on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('cropFertilizerState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.n) setN(state.n);
                if (state.p) setP(state.p);
                if (state.k) setK(state.k);
                if (state.ph) setPh(state.ph);
                if (state.rainfall) setRainfall(state.rainfall);
                if (state.recommendations) setRecommendations(state.recommendations);
            } catch (e) {
                console.error("Failed to parse session storage", e);
            }
        }
    }, []);

    // Save state to session storage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('cropFertilizerState', JSON.stringify({
            n, p, k, ph, rainfall, recommendations
        }));
    }, [n, p, k, ph, rainfall, recommendations]);

    const handleGeneratePDF = async () => {
        const element = reportRef.current;
        const opt = {
            margin: 10,
            filename: 'Crop_Fertilizer_Report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        const buttons = element.querySelectorAll('.pdf-exclude');
        buttons.forEach(btn => btn.style.display = 'none');

        try {
            const generatePdf = typeof html2pdf === 'function' ? html2pdf : html2pdf.default;
            await generatePdf().set(opt).from(element).save();
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("Failed to generate PDF. Please check the console for details.");
        } finally {
            buttons.forEach(btn => btn.style.display = '');
        }
    };

    const getRecommendations = async () => {
        if (!n || !p || !k || !ph || !rainfall) {
            setError(t('crop_ai.error_fill') || 'Please fill in all parameters.');
            return;
        }
        
        const numN = Number(n);
        const numP = Number(p);
        const numK = Number(k);
        const numPh = Number(ph);
        const numRain = Number(rainfall);

        if (numN < 0 || numN > 500 || numP < 0 || numP > 500 || numK < 0 || numK > 500) {
            setError(t('crop_ai.error_npk') || 'NPK values must be between 0 and 500.');
            return;
        }
        if (numPh < 0 || numPh > 14) {
            setError(t('crop_ai.error_ph') || 'pH level must be between 0 and 14.');
            return;
        }
        if (numRain < 0 || numRain > 10000) {
            setError(t('crop_ai.error_rain') || 'Rainfall must be between 0 and 10000 mm.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/soil/recommend?lang=${i18n.language}`, {
                nitrogen: numN,
                phosphorus: numP,
                potassium: numK,
                ph: numPh,
                rainfall: numRain
            });
            setRecommendations(response.data);
        } catch (err) {
            console.error("Failed to load recommendations:", err);
            setError("Failed to generate AI recommendations. Please check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleSoilUpload = async (e) => {
        e.preventDefault();
        if (!soilFile) return;
        setUploadingSoil(true);
        setSoilReportResult(null);
        const formData = new FormData();
        formData.append('file', soilFile);

        try {
            const res = await axios.post(`${API_BASE_URL}/api/soil/upload?userId=${userId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const data = res.data;
            const nVal = data.nitrogen !== undefined ? data.nitrogen : data.n;
            const pVal = data.phosphorus !== undefined ? data.phosphorus : data.p;
            const kVal = data.potassium !== undefined ? data.potassium : data.k;
            const phVal = data.ph;
            
            if (nVal !== undefined && nVal !== null) setN(nVal);
            if (pVal !== undefined && pVal !== null) setP(pVal);
            if (kVal !== undefined && kVal !== null) setK(kVal);
            if (phVal !== undefined && phVal !== null) setPh(phVal);
            
            setSoilReportResult(data);
            alert("Soil report parsed successfully! Customized AI recommendations generated below.");
        } catch (err) {
            console.error("Soil upload failed:", err);
            alert(err.response?.data?.message || "Failed to parse soil report PDF.");
        } finally {
            setUploadingSoil(false);
        }
    };

    const handleDiseaseDetect = async (e) => {
        e.preventDefault();
        if (!diseaseFile) return;
        setDetectingDisease(true);
        setDiseaseResult(null);
        const formData = new FormData();
        formData.append('file', diseaseFile);
        formData.append('cropCategory', cropCategory);
        formData.append('userId', userId);
        formData.append('lang', i18n.language);

        try {
            const res = await axios.post(`${API_BASE_URL}/api/disease/detect`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setDiseaseResult(res.data);
        } catch (err) {
            console.error("Disease detection failed:", err);
            alert(err.response?.data?.message || "Failed to analyze leaf disease image.");
        } finally {
            setDetectingDisease(false);
        }
    };

    return (
        <Container fluid className="p-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-white fw-bold mb-0">
                    <i className="bi bi-flower1 text-success"></i> {t('crop_ai.title')}
                </h2>
                {activeTab === 'advisor' && (
                    <Button 
                        className="btn-export-custom rounded-pill px-4 d-flex align-items-center gap-2 pdf-exclude shadow-sm"
                        onClick={handleGeneratePDF}
                    >
                        <i className="bi bi-file-earmark-pdf-fill text-danger"></i> {t('crop_ai.export_report')}
                    </Button>
                )}
            </div>

            <Tabs 
                variant="pills" 
                activeKey={activeTab} 
                onSelect={(k) => setActiveTab(k)} 
                className="mb-4 justify-content-center gap-2 pdf-exclude custom-pills"
            >
                <Tab eventKey="advisor" title="Crop Advisor" tabClassName="text-white px-4 py-2 rounded-pill border-0">
                    <div ref={reportRef}>
                        <Row className="g-4">
                            <Col lg={4}>
                                <Card className="glass-panel border-0 text-white h-100">
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold mb-3">{t('crop_ai.soil_params')}</h5>
                                        <Form>
                                            <Row className="g-2">
                                                <Col sm={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="text-secondary small">{t('crop_ai.nitrogen')}</Form.Label>
                                                        <Form.Control type="number" value={n} onChange={(e) => setN(e.target.value)} className="bg-transparent text-white border-secondary shadow-none" />
                                                    </Form.Group>
                                                </Col>
                                                <Col sm={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="text-secondary small">{t('crop_ai.phosphorus')}</Form.Label>
                                                        <Form.Control type="number" value={p} onChange={(e) => setP(e.target.value)} className="bg-transparent text-white border-secondary shadow-none" />
                                                    </Form.Group>
                                                </Col>
                                                <Col sm={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="text-secondary small">{t('crop_ai.potassium')}</Form.Label>
                                                        <Form.Control type="number" value={k} onChange={(e) => setK(e.target.value)} className="bg-transparent text-white border-secondary shadow-none" />
                                                    </Form.Group>
                                                </Col>
                                                <Col sm={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="text-secondary small">{t('crop_ai.ph_level')}</Form.Label>
                                                        <Form.Control type="number" step="0.1" value={ph} onChange={(e) => setPh(e.target.value)} className="bg-transparent text-white border-secondary shadow-none" />
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="text-secondary small">{t('crop_ai.avg_rainfall')}</Form.Label>
                                                <Form.Control type="number" value={rainfall} onChange={(e) => setRainfall(e.target.value)} className="bg-transparent text-white border-secondary shadow-none" />
                                            </Form.Group>
                                            <Button 
                                                variant="success" 
                                                className="w-100 py-2 fw-bold border-0 mt-2 pdf-exclude d-flex justify-content-center align-items-center gap-2"
                                                onClick={getRecommendations}
                                                disabled={loading}
                                            >
                                                {loading ? <CircularProgress size={20} color="inherit" /> : null}
                                                {loading ? t('crop_ai.analyzing') : t('crop_ai.get_recs')}
                                            </Button>
                                            {error && <div className="text-danger small mt-2 fw-bold text-center"><i className="bi bi-exclamation-triangle-fill"></i> {error}</div>}
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col lg={8}>
                                {recommendations ? (
                                    <>
                                        <h5 className="text-white fw-bold mb-3">{t('crop_ai.top_recs')}</h5>
                                        <Row className="g-3">
                                            {recommendations.map((rec, index) => (
                                                <Col md={6} key={index}>
                                                    <Card className="glass-panel border-0 text-white h-100" style={{ borderLeft: `4px solid var(--bs-${rec.bg}) !important` }}>
                                                        <Card.Body className="p-4">
                                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                                <div>
                                                                    <h4 className={`fw-bold text-${rec.bg} mb-1`}>{rec.crop}</h4>
                                                                    <p className="text-secondary small mb-0">High Suitability ({rec.match}% Match)</p>
                                                                </div>
                                                                <Badge bg={rec.bg}>{rec.type}</Badge>
                                                            </div>
                                                            <p className="small mb-3">{rec.desc}</p>
                                                            <div className="p-2 rounded border border-secondary" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                                                <div className="text-secondary small mb-1"><i className="bi bi-bag-plus"></i> {t('crop_ai.fertilizer')}:</div>
                                                                <div className="fw-bold">{rec.fert}</div>
                                                                <div className="small text-info">{t('crop_ai.dosage')}: {rec.dose}</div>
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    </>
                                ) : (
                                    <div className="h-100 d-flex flex-column justify-content-center align-items-center text-secondary border border-secondary rounded glass-panel p-5 text-center" style={{ minHeight: '300px', borderColor: 'rgba(255,255,255,0.1) !important' }}>
                                        <i className="bi bi-robot mb-3" style={{ fontSize: '3rem' }}></i>
                                        <h5 className="fw-bold text-white">{t('crop_ai.awaiting')}</h5>
                                        <p className="mb-0 mx-auto" style={{ maxWidth: '400px' }}>Enter your {t('crop_ai.soil_params')} and click "Get AI Recommendations" to generate custom crop suggestions.</p>
                                    </div>
                                )}
                            </Col>
                        </Row>
                    </div>
                </Tab>

                <Tab eventKey="disease" title={t('crop_ai.leaf_doctor_title')} tabClassName="text-white px-4 py-2 rounded-pill border-0">
                    <Row className="g-4">
                        <Col lg={4}>
                            <Card className="glass-panel border-0 text-white h-100">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-3"><i className="bi bi-shield-plus text-success"></i> {t('crop_ai.leaf_analysis')}</h5>
                                    <Form onSubmit={handleDiseaseDetect}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="text-secondary small">{t('crop_ai.crop_category')}</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder={t('crop_ai.search_crop')}
                                                value={cropSearch}
                                                onChange={(e) => setCropSearch(e.target.value)}
                                                className="bg-transparent text-white border-secondary shadow-none mb-2"
                                            />
                                            <Form.Select 
                                                value={cropCategory} 
                                                onChange={(e) => setCropCategory(e.target.value)} 
                                                className="bg-transparent text-white border-secondary shadow-none"
                                            >
                                                {['Cotton', 'Rice', 'Sugarcane', 'Wheat', 'Maize', 'Soybean', 'Potato', 'Tomato', 'Onion']
                                                    .filter(c => c.toLowerCase().includes(cropSearch.toLowerCase()))
                                                    .map((c, i) => (
                                                        <option key={i} value={c} className="bg-dark text-white">{c}</option>
                                                    ))
                                                }
                                            </Form.Select>
                                        </Form.Group>
                                        <Form.Group className="mb-4">
                                            <Form.Label className="text-secondary small">{t('crop_ai.select_leaf')}</Form.Label>
                                            <Form.Control 
                                                type="file" 
                                                accept="image/*"
                                                onChange={(e) => setDiseaseFile(e.target.files[0])} 
                                                className="bg-transparent text-white border-secondary shadow-none" 
                                            />
                                        </Form.Group>
                                        <Button 
                                            type="submit" 
                                            variant="success" 
                                            className="w-100 py-2 fw-bold border-0 d-flex justify-content-center align-items-center gap-2"
                                            disabled={detectingDisease || !diseaseFile}
                                        >
                                            {detectingDisease ? <CircularProgress size={20} color="inherit" /> : null}
                                            {detectingDisease ? t('crop_ai.analyzing_image') : t('crop_ai.detect_disease')}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={8}>
                            {diseaseResult ? (
                                <Card className="glass-panel border-0 text-white h-100">
                                    <Card.Body className="p-4">
                                        {(diseaseResult.isMatch === false || diseaseResult.IsMatch === false) ? (
                                            <div className="text-center py-4">
                                                <i className="bi bi-exclamation-triangle-fill text-danger mb-3 d-block" style={{ fontSize: '3rem' }}></i>
                                                <h4 className="fw-bold text-danger mb-3">{t('crop_ai.mismatch_title')}</h4>
                                                <p className="fs-6 text-secondary mb-4">
                                                    {t('crop_ai.mismatch_detected')} (<strong>{diseaseResult.detectedCrop || diseaseResult.DetectedCrop}</strong>) rather than the selected <strong>{cropCategory}</strong>.
                                                </p>
                                                <div className="p-3 rounded bg-dark bg-opacity-50 text-secondary small">
                                                    {diseaseResult.message || diseaseResult.Message}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-3 mb-3">
                                                    <h4 className="fw-bold text-success mb-0">{diseaseResult.DiseaseName || diseaseResult.disease}</h4>
                                                    <Badge bg="danger">{diseaseResult.confidence || 95}% {t('crop_ai.confidence')}</Badge>
                                                </div>
                                                <Row className="g-3">
                                                    <Col md={12}>
                                                        <div className="mb-3">
                                                            <h6 className="text-secondary mb-1">{t('crop_ai.potential_cause')}</h6>
                                                            <p className="mb-0">{diseaseResult.Cause || diseaseResult.symptoms}</p>
                                                        </div>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Card className="bg-dark border-0 p-3 h-100">
                                                            <h6 className="text-success mb-2"><i className="bi bi-tree"></i> {t('crop_ai.organic_treatment')}</h6>
                                                            <p className="small mb-0 text-secondary">{diseaseResult.Treatment || diseaseResult.treatment}</p>
                                                        </Card>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Card className="bg-dark border-0 p-3 h-100">
                                                            <h6 className="text-warning mb-2"><i className="bi bi-droplet-half"></i> {t('crop_ai.chemical_treatment')}</h6>
                                                            <p className="small mb-0 text-secondary">{diseaseResult.FertilizerSuggestion || diseaseResult.prevention || diseaseResult.Treatment || diseaseResult.treatment}</p>
                                                        </Card>
                                                    </Col>
                                                    <Col md={12}>
                                                        <Card className="bg-dark border-0 p-3 mt-2">
                                                            <h6 className="text-info mb-1"><i className="bi bi-shield-check"></i> {t('crop_ai.preventive_measures')}</h6>
                                                            <p className="small mb-0 text-secondary">{diseaseResult.PreventiveMeasures || diseaseResult.prevention}</p>
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            ) : (
                                <div className="h-100 d-flex flex-column justify-content-center align-items-center text-secondary border border-secondary rounded glass-panel p-5 text-center" style={{ minHeight: '300px', borderColor: 'rgba(255,255,255,0.1) !important' }}>
                                    <i className="bi bi-camera mb-3 text-info opacity-50" style={{ fontSize: '3rem' }}></i>
                                    <h5 className="fw-bold text-white">{t('crop_ai.leaf_analysis_ready')}</h5>
                                    <p className="mb-0 mx-auto" style={{ maxWidth: '400px' }}>{t('crop_ai.leaf_analysis_ready_desc')}</p>
                                </div>
                            )}
                        </Col>
                    </Row>
                </Tab>

                <Tab eventKey="soil" title={t('crop_ai.upload_pdf_title')} tabClassName="text-white px-4 py-2 rounded-pill border-0">
                    <Row className="g-4">
                        <Col lg={soilReportResult ? 5 : 6} className="mx-auto">
                            <Card className="glass-panel border-0 text-white shadow-lg">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-3"><i className="bi bi-file-earmark-pdf text-info"></i> {t('crop_ai.upload_pdf_title')}</h5>
                                    <p className="text-secondary small mb-4">{t('crop_ai.upload_pdf_desc')}</p>
                                    <Form onSubmit={handleSoilUpload}>
                                        <Form.Group className="mb-4">
                                            <Form.Label className="text-secondary small">{t('crop_ai.select_pdf')}</Form.Label>
                                            <Form.Control 
                                                type="file" 
                                                accept="application/pdf"
                                                onChange={(e) => setSoilFile(e.target.files[0])}
                                                className="bg-transparent text-white border-secondary shadow-none" 
                                            />
                                        </Form.Group>
                                        <Button 
                                            type="submit" 
                                            variant="info" 
                                            className="w-100 py-2 fw-bold text-dark border-0 d-flex justify-content-center align-items-center gap-2"
                                            disabled={uploadingSoil || !soilFile}
                                        >
                                            {uploadingSoil ? <CircularProgress size={20} color="inherit" /> : null}
                                            {uploadingSoil ? t('crop_ai.parsing_pdf') : t('crop_ai.upload_parse_btn')}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>
                        {soilReportResult && (
                            <Col lg={7}>
                                <Card className="glass-panel border-0 text-white shadow-lg animate__animated animate__fadeIn">
                                    <Card.Body className="p-4">
                                        <h5 className="fw-bold text-info mb-3 d-flex align-items-center gap-2">
                                            <i className="bi bi-patch-check-fill text-success"></i> {t('crop_ai.soil_health_analysis')}
                                        </h5>
                                        <hr className="bg-secondary mb-3" />
                                        
                                        <div className="mb-3">
                                            <h6 className="text-secondary mb-1 small fw-bold">{t('crop_ai.soil_health_status')}</h6>
                                            <p className="mb-0 text-light">{soilReportResult.soilHealthStatus}</p>
                                        </div>
                                        <div className="mb-3">
                                            <h6 className="text-secondary mb-1 small fw-bold">{t('crop_ai.nutrient_deficiency')}</h6>
                                            <p className="mb-0 text-warning">{soilReportResult.nutrientDeficiency}</p>
                                        </div>
                                        <div className="mb-3">
                                            <h6 className="text-secondary mb-1 small fw-bold">{t('crop_ai.suitable_crops')}</h6>
                                            <div className="d-flex flex-wrap gap-2 mt-1">
                                                {soilReportResult.suitableCrops && soilReportResult.suitableCrops.map((crop, idx) => (
                                                    <Badge key={idx} bg="success" className="fs-7 py-1 px-3 rounded-pill">{crop}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <h6 className="text-secondary mb-1 small fw-bold">{t('crop_ai.fertilizer_recommendations')}</h6>
                                            <p className="mb-0 text-light">{soilReportResult.fertilizerRecommendations}</p>
                                        </div>
                                        <div className="mb-3">
                                            <h6 className="text-secondary mb-1 small fw-bold">{t('crop_ai.water_management_advice')}</h6>
                                            <p className="mb-0 text-light">{soilReportResult.waterManagementAdvice}</p>
                                        </div>
                                        <div className="mb-3">
                                            <h6 className="text-secondary mb-1 small fw-bold">{t('crop_ai.gov_schemes')}</h6>
                                            <p className="mb-0 text-info">{soilReportResult.relevantGovernmentSchemes}</p>
                                        </div>
                                        
                                        <div className="mt-4 p-3 rounded bg-dark bg-opacity-40 border border-secondary text-secondary small d-flex justify-content-between align-items-center flex-wrap gap-2">
                                            <span>
                                                <strong>{t('crop_ai.extracted_values')}</strong> N: {soilReportResult.nitrogen} | P: {soilReportResult.phosphorus} | K: {soilReportResult.potassium} | pH: {soilReportResult.ph}
                                            </span>
                                            <Button variant="outline-info" size="sm" className="fw-bold rounded-pill px-3" onClick={() => {
                                                setN(soilReportResult.nitrogen);
                                                setP(soilReportResult.phosphorus);
                                                setK(soilReportResult.potassium);
                                                setPh(soilReportResult.ph);
                                                alert("Values pre-filled inside Crop Advisor tab!");
                                                setActiveTab('advisor');
                                            }}>
                                                {t('crop_ai.apply_advisor')}
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}
                    </Row>
                </Tab>
            </Tabs>

            <InsightsFooter />
        </Container>
    );
}
