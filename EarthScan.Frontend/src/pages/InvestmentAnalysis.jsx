import React, { useState, useContext, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import InsightsFooter from '../components/InsightsFooter';
import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SavedSearchContext } from '../context/SavedSearchContext';
import { useLocation } from 'react-router-dom';

export default function InvestmentAnalysis() {
    const [region, setRegion] = useState('Pune');
    const [crop, setCrop] = useState('Sugarcane');
    const [investment, setInvestment] = useState(5130000);
    const [years, setYears] = useState(5);

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const { t } = useTranslation();
    const { savedLocations } = useContext(SavedSearchContext);
    const [selectedSavedLandId, setSelectedSavedLandId] = useState('');
    const location = useLocation();

    // Hook to handle router state navigation (Load Profile)
    useEffect(() => {
        if (location.state && location.state.selectedLandId) {
            setSelectedSavedLandId(location.state.selectedLandId);
            // Clean the state to avoid loop on reload
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Update investment and region fields when saved land is selected
    useEffect(() => {
        if (selectedSavedLandId) {
            const selected = savedLocations.find(s => String(s.id) === String(selectedSavedLandId));
            if (selected) {
                setInvestment(selected.price || 5130000);
                setRegion(selected.pin || 'Pune');
                // Run simulation automatically
                triggerSimulation(selected);
            }
        }
    }, [selectedSavedLandId, savedLocations]);

    const triggerSimulation = (selectedLand) => {
        setLoading(true);
        setTimeout(() => {
            const data = [];
            const landInvestment = selectedLand ? Number(selectedLand.price || 5130000) : Number(investment);
            let currentVal = landInvestment;
            let baseGrowthRate = crop === 'Sugarcane' ? 0.12 : crop === 'Cotton' ? 0.08 : crop === 'Mango' ? 0.15 : 0.10;
            let finalRisk = crop === 'Cotton' ? 'High' : 'Medium';

            if (selectedLand) {
                const score = selectedLand.score || 75;
                const scoreFactor = (score - 60) / 200; // e.g. score 80 -> +10% relative growth increase
                baseGrowthRate += scoreFactor;

                // Set risk based on water level and intelligence score
                if (selectedLand.water === 'High' || Number(selectedLand.water) > 80 || score >= 80) {
                    finalRisk = 'Low';
                } else if (selectedLand.water === 'Low' || Number(selectedLand.water) < 30 || score < 60) {
                    finalRisk = 'High';
                }
            }

            for (let i = 0; i <= years; i++) {
                data.push({
                    year: `Year ${i}`,
                    value: Math.round(currentVal),
                    cost: Math.round(landInvestment + (i * 150000))
                });
                // Deterministic compound growth projection without random variations
                const annualIncrement = (i + 1) * 35000;
                currentVal += (currentVal * baseGrowthRate) + annualIncrement;
            }

            const finalValue = data[data.length - 1].value;
            const totalCost = data[data.length - 1].cost;
            const roi = (((finalValue - totalCost) / totalCost) * 100).toFixed(1);

            setResults({
                data,
                finalValue,
                roi,
                breakEven: crop === 'Mango' ? 'Year 4' : 'Year 2',
                risk: finalRisk
            });
            setLoading(false);
        }, 1000);
    };

    const handleSimulate = () => {
        const selected = selectedSavedLandId ? savedLocations.find(s => String(s.id) === String(selectedSavedLandId)) : null;
        triggerSimulation(selected);
    };

    const formatCurrency = (val) => {
        return `₹${(val / 100000).toFixed(1)}L`;
    };

    const selectedLand = selectedSavedLandId ? savedLocations.find(s => String(s.id) === String(selectedSavedLandId)) : null;

    return (
        <Container fluid className="p-0">
            <h2 className="text-white fw-bold mb-4">
                <i className="bi bi-graph-up-arrow text-success animate__animated animate__fadeIn"></i> {t('investment.title')}
            </h2>

            <Row className="g-4 mb-4">
                <Col lg={4}>
                    <Card className="glass-panel border-0 text-white h-100 shadow">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-4 text-light">Simulation Parameters</h5>
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Select Saved Property (Optional)</Form.Label>
                                    <Form.Select
                                        value={selectedSavedLandId}
                                        onChange={e => setSelectedSavedLandId(e.target.value)}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        style={{ backgroundColor: '#141d2b' }}
                                    >
                                        <option value="" className="bg-dark">-- Select Saved Land --</option>
                                        {savedLocations.map((land, idx) => (
                                            <option key={idx} value={land.id} className="bg-dark">
                                                {land.name} ({land.pin})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Target Region</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={region}
                                        onChange={e => setRegion(e.target.value)}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        placeholder="Region name or pincode"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Primary Planned Crop</Form.Label>
                                    <Form.Select
                                        value={crop}
                                        onChange={e => setCrop(e.target.value)}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        style={{ backgroundColor: '#141d2b' }}
                                    >
                                        <option value="Sugarcane" className="bg-dark">Sugarcane</option>
                                        <option value="Cotton" className="bg-dark">Cotton</option>
                                        <option value="Mango" className="bg-dark">Alphonso Mango</option>
                                        <option value="Soybean" className="bg-dark">Soybean</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-secondary small">Initial Investment (₹)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={investment}
                                        onChange={e => setInvestment(e.target.value)}
                                        className="bg-transparent text-white border-secondary shadow-none"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="text-secondary small">Time Horizon (Years): {years}</Form.Label>
                                    <Form.Range
                                        min={1} max={15}
                                        value={years}
                                        onChange={e => setYears(e.target.value)}
                                    />
                                </Form.Group>

                                <Button
                                    variant="success"
                                    className="w-100 py-2 fw-bold rounded-pill d-flex justify-content-center align-items-center gap-2 shadow-sm"
                                    onClick={handleSimulate}
                                    disabled={loading}
                                >
                                    {loading ? <CircularProgress size={20} color="inherit" /> : <i className="bi bi-cpu"></i>}
                                    {loading ? 'Running AI Model...' : 'Run Simulation'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={8}>
                    {results ? (
                        <>
                            <Row className="g-3 mb-4">
                                <Col md={4}>
                                    <Card className="glass-panel border-0 text-white text-center shadow-sm">
                                        <Card.Body className="py-4">
                                            <h6 className="text-secondary mb-2">Projected ROI</h6>
                                            <h2 className="fw-bold text-success mb-0">+{results.roi}%</h2>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="glass-panel border-0 text-white text-center shadow-sm">
                                        <Card.Body className="py-4">
                                            <h6 className="text-secondary mb-2">Estimated Value (Yr {years})</h6>
                                            <h2 className="fw-bold text-info mb-0">{formatCurrency(results.finalValue)}</h2>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="glass-panel border-0 text-white text-center shadow-sm">
                                        <Card.Body className="py-4">
                                            <h6 className="text-secondary mb-2">Break-Even Point</h6>
                                            <h2 className="fw-bold text-warning mb-0">{results.breakEven}</h2>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            <Card className="glass-panel border-0 text-white shadow-sm mb-4">
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <h5 className="fw-bold mb-0 text-light">Value Growth Projection</h5>
                                        <Badge bg={results.risk === 'High' ? 'danger' : results.risk === 'Low' ? 'success' : 'warning'} className="px-3 py-2 rounded-pill">
                                            Risk Profile: {results.risk}
                                        </Badge>
                                    </div>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={results.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#00e676" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="year" stroke="#a0aec0" />
                                                <YAxis stroke="#a0aec0" tickFormatter={formatCurrency} />
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0a0f18', borderColor: '#2979ff', color: '#fff', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#00e676' }}
                                                    formatter={(value) => formatCurrency(value)}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#00e676" fillOpacity={1} fill="url(#colorValue)" name="Projected Value" strokeWidth={3} />
                                                <Line type="monotone" dataKey="cost" stroke="#ff5252" strokeWidth={2} dot={false} name="Cumulative Cost" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card.Body>
                            </Card>
                        </>
                    ) : (
                        <Card className="glass-panel border-0 text-white h-100 d-flex justify-content-center align-items-center shadow-lg" style={{ borderRadius: '16px', minHeight: '400px' }}>
                            <Card.Body className="text-center p-5 text-secondary">
                                <i className="bi bi-bar-chart-line mb-3 d-block text-success animate__animated animate__pulse animate__infinite" style={{ fontSize: '4.5rem' }}></i>
                                <h4 className="fw-bold text-white mb-2">Awaiting Parameters</h4>
                                <p className="mb-0 mx-auto" style={{ maxWidth: '440px' }}>Select a saved property or adjust the custom parameters on the left, then click <strong>Run Simulation</strong> to simulate projected ROI, land appreciation, and yield revenue over time.</p>
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>

            <InsightsFooter />
        </Container>
    );
}
