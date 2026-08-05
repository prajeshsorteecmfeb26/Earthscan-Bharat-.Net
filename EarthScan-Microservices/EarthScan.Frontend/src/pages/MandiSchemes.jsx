import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import InsightsFooter from '../components/InsightsFooter';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { API_BASE_URL } from '../config';

export default function MandiSchemes() {
    const [searchQuery, setSearchQuery] = useState('');
    const [mandiPrices, setMandiPrices] = useState([]);
    const [loadingPrices, setLoadingPrices] = useState(true);
    const [selectedMandi, setSelectedMandi] = useState(null);
    
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    const [schemes, setSchemes] = useState([]);
    const [loadingSchemes, setLoadingSchemes] = useState(true);

    const { t } = useTranslation();

    // Fetch Mandi Prices on search change (with 400ms debounce)
    useEffect(() => {
        const fetchPrices = async () => {
            setLoadingPrices(true);
            try {
                const url = searchQuery 
                    ? `${API_BASE_URL}/api/mandi?crop=${encodeURIComponent(searchQuery)}`
                    : `${API_BASE_URL}/api/mandi`;
                const pricesResponse = await axios.get(url);
                setMandiPrices(pricesResponse.data);
                
                // Select first item by default if available
                if (pricesResponse.data.length > 0) {
                    handleSelectMandi(pricesResponse.data[0]);
                } else {
                    setSelectedMandi(null);
                    setHistoryData([]);
                }
            } catch (err) {
                console.error("Error loading mandi prices:", err);
            } finally {
                setLoadingPrices(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchPrices();
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Fetch Schemes on mount
    useEffect(() => {
        const loadSchemes = async () => {
            try {
                const schemesResponse = await axios.get(`${API_BASE_URL}/api/schemes`);
                setSchemes(schemesResponse.data);
            } catch (err) {
                console.error("Error loading schemes:", err);
            } finally {
                setLoadingSchemes(false);
            }
        };
        loadSchemes();
    }, []);

    const handleSelectMandi = async (mandi) => {
        if (!mandi) return;
        setSelectedMandi(mandi);
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/mandi/history?mandiPriceId=${mandi.id}`);
            setHistoryData(res.data);
        } catch (err) {
            console.error("Error loading price history:", err);
            setHistoryData([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fuzzyMatch = (text, query) => {
        if (!query) return true;
        if (!text) return false;
        const t = text.toLowerCase();
        const q = query.toLowerCase();
        if (t.includes(q) || q.includes(t)) return true;
        
        // Vowel normalization (e.g. sugarcane -> sgrcn, sugercan -> sgrcn)
        const normalize = s => s.replace(/[aeiou\s]/g, '');
        const nt = normalize(t);
        const nq = normalize(q);
        if (nt.includes(nq) || nq.includes(nt)) return true;

        // Common start abbreviation
        if (q.length >= 3 && t.startsWith(q.substring(0, 3))) return true;

        return false;
    };

    const filteredPrices = mandiPrices.filter(item => 
        fuzzyMatch(item.market, searchQuery) || 
        fuzzyMatch(item.commodity, searchQuery) ||
        fuzzyMatch(item.variety, searchQuery)
    );

    const formatPrice = (val) => {
        return `₹${Number(val).toLocaleString('en-IN')}`;
    };

    return (
        <Container fluid className="p-0">
            <h2 className="text-white fw-bold mb-4">
                <i className="bi bi-graph-up-arrow text-warning"></i> {t('mandi.title')}
            </h2>
            <Row className="g-4 mb-4">
                {/* Live Mandi Prices Table */}
                <Col lg={7}>
                    <Card className="glass-panel border-0 text-white h-100">
                        <Card.Body className="p-4 d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="fw-bold mb-0">{t('mandi.prices_tab')}</h5>
                                <Badge bg="danger" className="d-flex align-items-center gap-1">
                                    <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                                    {t('mandi.live_badge')}
                                </Badge>
                            </div>

                            <Form className="mb-4" onSubmit={e => e.preventDefault()}>
                                <InputGroup>
                                    <InputGroup.Text className="bg-transparent border-secondary text-secondary">
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by commodity, variety or market..."
                                        className="bg-transparent text-white border-secondary shadow-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </InputGroup>
                            </Form>

                            {loadingPrices ? (
                                <div className="text-center py-5 my-auto">
                                    <Spinner animation="border" variant="warning" />
                                    <p className="text-secondary mt-2">Loading mandi prices from database...</p>
                                </div>
                            ) : (
                                <div className="table-responsive flex-grow-1">
                                    <Table variant="dark" hover className="bg-transparent mb-0 align-middle">
                                        <thead>
                                            <tr>
                                                <th className="text-secondary bg-transparent border-secondary">Commodity</th>
                                                <th className="text-secondary bg-transparent border-secondary">Market</th>
                                                <th className="text-secondary bg-transparent border-secondary text-end">Min Price</th>
                                                <th className="text-secondary bg-transparent border-secondary text-end">Modal Price</th>
                                                <th className="text-secondary bg-transparent border-secondary text-center">Trend</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPrices.length > 0 ? (
                                                filteredPrices.map(item => {
                                                    const isSelected = selectedMandi && selectedMandi.id === item.id;
                                                    return (
                                                        <tr 
                                                            key={item.id} 
                                                            onClick={() => handleSelectMandi(item)}
                                                            style={{ cursor: 'pointer', background: isSelected ? 'rgba(255, 193, 7, 0.1)' : 'transparent' }}
                                                            className={isSelected ? 'border-start border-warning border-3' : ''}
                                                        >
                                                            <td className="bg-transparent border-secondary">
                                                                <div className="fw-bold">{item.commodity}</div>
                                                                <small className="text-secondary">{item.variety}</small>
                                                            </td>
                                                            <td className="bg-transparent border-secondary">{item.market}</td>
                                                            <td className="bg-transparent border-secondary text-end text-secondary">{formatPrice(item.minPrice)}</td>
                                                            <td className={`bg-transparent border-secondary text-end fw-bold text-${item.isUp ? 'success' : 'danger'}`}>
                                                                {formatPrice(item.modalPrice)}
                                                            </td>
                                                            <td className={`bg-transparent border-secondary text-center text-${item.isUp ? 'success' : 'danger'}`}>
                                                                <i className={`bi bi-arrow-${item.isUp ? 'up' : 'down'}-right`}></i> {item.trend}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center bg-transparent border-secondary py-4 text-secondary">
                                                        {t('mandi.no_results')} "{searchQuery}"
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Mandi Price Trend Graph & Detailed view */}
                <Col lg={5}>
                    <Card className="glass-panel border-0 text-white h-100">
                        <Card.Body className="p-4 d-flex flex-column">
                            {selectedMandi ? (
                                <div className="d-flex flex-column h-100">
                                    <div className="mb-3 border-bottom border-secondary pb-3">
                                        <Badge bg="warning" className="text-dark mb-2">APMC Details</Badge>
                                        <h3 className="fw-bold text-gradient mb-1" style={{ background: 'linear-gradient(45deg, #ffc107, #ff9100)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                            {selectedMandi.commodity}
                                        </h3>
                                        <p className="text-secondary small mb-0">
                                            <i className="bi bi-geo-alt-fill text-danger me-1"></i> {selectedMandi.market} | Variety: <strong>{selectedMandi.variety}</strong>
                                        </p>
                                    </div>

                                    <Row className="g-3 mb-4">
                                        <Col xs={4} className="text-center border-end border-secondary">
                                            <div className="text-secondary small">Min Price</div>
                                            <h5 className="fw-bold mb-0 text-secondary">{formatPrice(selectedMandi.minPrice)}</h5>
                                        </Col>
                                        <Col xs={4} className="text-center border-end border-secondary">
                                            <div className="text-secondary small">Modal Price</div>
                                            <h4 className="fw-bold mb-0 text-warning">{formatPrice(selectedMandi.modalPrice)}</h4>
                                        </Col>
                                        <Col xs={4} className="text-center">
                                            <div className="text-secondary small">Max Price</div>
                                            <h5 className="fw-bold mb-0 text-white">{formatPrice(selectedMandi.maxPrice)}</h5>
                                        </Col>
                                    </Row>

                                    <div className="p-3 rounded mb-4 text-center" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="text-secondary small">Arrival Quantity:</span>
                                            <span className="fw-bold">{selectedMandi.arrivalQuantity} Tonnes</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-secondary small">Last Sync Cache:</span>
                                            <span className="text-secondary small">{new Date(selectedMandi.lastUpdated).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>

                                    <h6 className="fw-bold mb-3"><i className="bi bi-activity text-warning me-2"></i>Price History (7 Days)</h6>
                                    
                                    <div className="flex-grow-1" style={{ minHeight: '200px' }}>
                                        {loadingHistory ? (
                                            <div className="h-100 d-flex justify-content-center align-items-center">
                                                <Spinner animation="border" variant="warning" size="sm" />
                                            </div>
                                        ) : historyData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={historyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="date" stroke="#a0aec0" fontSize={10} tickLine={false} />
                                                    <YAxis stroke="#a0aec0" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                                                    <Tooltip 
                                                        contentStyle={{ background: '#0a0f18', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                                        labelStyle={{ fontWeight: 'bold' }}
                                                    />
                                                    <Line type="monotone" dataKey="price" name="Rate (₹/q)" stroke="#ffc107" strokeWidth={3} activeDot={{ r: 8 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-100 d-flex justify-content-center align-items-center text-secondary small">
                                                No historical data available.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-100 d-flex flex-column justify-content-center align-items-center text-center text-secondary p-5">
                                    <i className="bi bi-graph-up mb-3" style={{ fontSize: '3rem' }}></i>
                                    <h5>Select a Commodity</h5>
                                    <p className="small mb-0">Click on any commodity in the table to display its historical price analysis and APMC arrival statistics.</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Government Schemes Panel */}
            <h4 className="fw-bold mb-3 text-white"><i className="bi bi-bank text-info me-2"></i>Government Schemes & Aid</h4>
            {loadingSchemes ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="info" />
                </div>
            ) : (
                <Row className="g-4 mb-4">
                    {schemes.map(scheme => (
                        <Col lg={4} md={6} key={scheme.id}>
                            <Card className="glass-panel border-0 text-white h-100">
                                <Card.Body className="p-4 d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h5 className="fw-bold text-info mb-0">{scheme.name}</h5>
                                        <Badge bg="success">Active</Badge>
                                    </div>
                                    <p className="text-secondary small mb-3 flex-grow-1">{scheme.description}</p>
                                    
                                    <div className="p-3 rounded mb-3 small" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="mb-2"><strong>Benefit:</strong> <span className="text-light">{scheme.benefit}</span></div>
                                        <div><strong>Eligibility:</strong> <span className="text-secondary">{scheme.eligibility}</span></div>
                                    </div>

                                    <Button 
                                        as="a" 
                                        href={scheme.applicationLink}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        variant="outline-info" 
                                        size="sm" 
                                        className="w-100 rounded-pill hover-white"
                                    >
                                        Apply Online <i className="bi bi-box-arrow-up-right ms-1"></i>
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            <InsightsFooter />
        </Container>
    );
}
