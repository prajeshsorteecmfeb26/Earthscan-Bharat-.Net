import React, { useContext } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InsightsFooter from '../components/InsightsFooter';
import { SavedSearchContext } from '../context/SavedSearchContext';

const API_BASE_URL = 'http://localhost:5130';

export default function SavedSearches() {
    const { savedLocations, removeSavedSearch } = useContext(SavedSearchContext);
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleDelete = (id) => {
        removeSavedSearch(id);
    };

    const handleLoadProfile = (id) => {
        navigate('/buyer/analysis', { state: { selectedLandId: id } });
    };

    return (
        <Container fluid className="p-0 d-flex flex-column min-vh-100">
            <div className="flex-grow-1">
                <h2 className="text-white fw-bold mb-4">
                    <i className="bi bi-bookmarks text-primary animate__animated animate__pulse animate__infinite"></i> {t('saved.title')}
                </h2>
                
                {savedLocations.length === 0 ? (
                    <div className="text-center mt-5 text-secondary">
                        <i className="bi bi-folder2-open display-1 text-muted"></i>
                        <h4 className="mt-3 text-light">{t('saved.no_saved')}</h4>
                        <p>{t('saved.no_saved_desc')}</p>
                    </div>
                ) : (
                    <Row className="g-4">
                        {savedLocations.map(location => (
                            <Col md={4} key={location.id}>
                                <Card className="glass-panel border-0 text-white overflow-hidden h-100 shadow-lg" style={{ borderRadius: '16px' }}>
                                    <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                                        {location.imagePath ? (
                                            <Card.Img 
                                                variant="top" 
                                                src={`${API_BASE_URL}${location.imagePath}`} 
                                                style={{ height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                                                className="hover-zoom"
                                            />
                                        ) : (
                                            <div className="w-100 h-100 bg-secondary d-flex align-items-center justify-content-center" style={{ minHeight: '180px' }}>
                                                <i className="bi bi-image text-white-50" style={{ fontSize: '3rem' }}></i>
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                            <span className="badge bg-dark bg-opacity-75 text-success fw-bold px-2 py-1" style={{ borderRadius: '6px' }}>
                                                ₹{(location.price / 100000).toFixed(1)}L
                                            </span>
                                        </div>
                                    </div>
                                    <Card.Body className="p-4 d-flex flex-column">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h5 className="fw-bold mb-1 text-light">{location.name}</h5>
                                                <p className="text-secondary small mb-0"><i className="bi bi-geo-alt text-danger"></i> PIN: {location.pin}</p>
                                            </div>
                                        </div>
                                        <div className="text-secondary small mb-4 flex-grow-1">
                                            <div className="mb-1"><i className="bi bi-calendar-event me-1"></i> {t('saved.saved_on')}: {location.date}</div>
                                            <div className="mb-1"><i className="bi bi-layers me-1"></i> {t('saved.soil')}: {location.soil || 'N/A'}</div>
                                            {location.sizeInAcres && (
                                                <div><i className="bi bi-aspect-ratio me-1"></i> Size: {location.sizeInAcres} Acres</div>
                                            )}
                                        </div>
                                        <div className="d-flex gap-2">
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                className="flex-grow-1 fw-bold py-2 rounded-pill shadow-sm"
                                                onClick={() => handleLoadProfile(location.id)}
                                            >
                                                Load Profile
                                            </Button>
                                            <Button 
                                                variant="outline-danger" 
                                                size="sm" 
                                                className="rounded-circle p-2 d-flex align-items-center justify-content-center"
                                                style={{ width: '38px', height: '38px' }}
                                                onClick={() => handleDelete(location.id)}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </div>
            
            <div className="mt-5">
                <InsightsFooter />
            </div>
        </Container>
    );
}
