import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Modal, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

export default function Forum() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Modal state for creating a post
    const [showPostModal, setShowPostModal] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });
    const [submittingPost, setSubmittingPost] = useState(false);

    // Comment state
    const [commentContent, setCommentContent] = useState('');
    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [submittingComment, setSubmittingComment] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/forum/posts`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setPosts(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching posts:', error);
            setErrorMsg(error.response?.data?.message || error.message || 'Failed to load forum posts.');
            setLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPost.title || !newPost.content) return;
        setSubmittingPost(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_BASE_URL}/api/forum/posts`, newPost, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setPosts([response.data.post, ...posts]); // Add new post to top (mock update until refresh)
            setShowPostModal(false);
            setNewPost({ title: '', content: '', category: 'General' });
            fetchPosts(); // Refresh to get fully formatted data with empty comments array
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post');
        } finally {
            setSubmittingPost(false);
        }
    };

    const handleAddComment = async (postId) => {
        if (!commentContent.trim()) return;
        setSubmittingComment(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_BASE_URL}/api/forum/posts/${postId}/comments`, { content: commentContent }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Update local state to show new comment instantly
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        comments: [...post.comments, response.data.comment]
                    };
                }
                return post;
            }));
            setCommentContent('');
            setActiveCommentPostId(null);
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'Admin': return 'warning';
            case 'Farmer': return 'success';
            case 'Land Buyer': return 'info';
            case 'Agriculture Expert': return 'primary';
            default: return 'secondary';
        }
    };

    const getCategoryBadgeColor = (category) => {
        switch (category) {
            case 'Crop Advice': return 'success';
            case 'Market Prices': return 'warning text-dark';
            case 'Equipment': return 'info';
            case 'Water & Irrigation': return 'primary';
            default: return 'secondary';
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <Container fluid className="p-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-white fw-bold mb-0">
                    <i className="bi bi-people-fill text-primary"></i> {t('forum.title')}
                </h2>
                <Button 
                    variant="success" 
                    className="rounded-pill px-4 fw-bold shadow-sm"
                    style={{ background: 'linear-gradient(90deg, #00e676, #00b259)', border: 'none' }}
                    onClick={() => setShowPostModal(true)}
                >
                    <i className="bi bi-pencil-square me-2"></i> {t('forum.new_post')}
                </Button>
            </div>

            <Row>
                <Col lg={8}>
                    {loading ? (
                        <div className="text-center p-5 text-secondary">
                            <Spinner animation="border" variant="success" className="mb-3" />
                            <p>Loading discussions...</p>
                        </div>
                    ) : errorMsg ? (
                        <div className="text-center p-5 text-danger border border-danger rounded bg-danger bg-opacity-10">
                            <i className="bi bi-exclamation-triangle-fill fs-3 mb-2 d-block"></i>
                            {errorMsg}
                            <p className="small mt-2">Did you run the backend migrations for the new Forum tables?</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <Card className="glass-panel border-0 text-white text-center p-5">
                            <Card.Body>
                                <i className="bi bi-chat-square-text text-secondary mb-3" style={{ fontSize: '3rem' }}></i>
                                <h4>No posts yet</h4>
                                <p className="text-secondary mb-0">Be the first to start a discussion in the community!</p>
                            </Card.Body>
                        </Card>
                    ) : (
                        posts.map(post => (
                            <Card key={post.id} className="glass-panel border-0 text-white mb-4">
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                                                {post.authorName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h6 className="mb-0 fw-bold">{post.authorName}</h6>
                                                <small className="text-secondary">
                                                    <Badge bg={getRoleBadgeColor(post.authorRole)} className="me-2">{post.authorRole}</Badge>
                                                    {formatDate(post.createdAt)}
                                                </small>
                                            </div>
                                        </div>
                                        <Badge bg={getCategoryBadgeColor(post.category)}>{post.category}</Badge>
                                    </div>
                                    
                                    <h5 className="fw-bold mb-2">{post.title}</h5>
                                    <p className="text-light mb-4" style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>

                                    <hr className="border-secondary opacity-25" />

                                    {/* Comments Section */}
                                    <div className="mt-3">
                                        <h6 className="fw-bold text-secondary mb-3">
                                            <i className="bi bi-chat-left-text-fill me-2"></i> 
                                            {post.comments?.length || 0} Comments
                                        </h6>
                                        
                                        {post.comments?.map(comment => (
                                            <div key={comment.id} className="mb-3 p-3 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="fw-bold small">
                                                        {comment.authorName} <Badge bg={getRoleBadgeColor(comment.authorRole)} className="ms-1" style={{ fontSize: '0.6rem' }}>{comment.authorRole}</Badge>
                                                    </span>
                                                    <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>{formatDate(comment.createdAt)}</span>
                                                </div>
                                                <p className="mb-0 small text-light">{comment.content}</p>
                                            </div>
                                        ))}

                                        {activeCommentPostId === post.id ? (
                                            <div className="mt-3">
                                                <Form.Control 
                                                    as="textarea" 
                                                    rows={2} 
                                                    placeholder="Write a reply..." 
                                                    value={commentContent}
                                                    onChange={(e) => setCommentContent(e.target.value)}
                                                    className="bg-transparent text-white border-secondary shadow-none mb-2"
                                                />
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button variant="outline-secondary" size="sm" onClick={() => {setActiveCommentPostId(null); setCommentContent('');}}>Cancel</Button>
                                                    <Button variant="primary" size="sm" onClick={() => handleAddComment(post.id)} disabled={submittingComment || !commentContent.trim()}>
                                                        {submittingComment ? 'Posting...' : 'Reply'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button variant="outline-light" size="sm" className="rounded-pill border-secondary text-secondary hover-white mt-2" onClick={() => setActiveCommentPostId(post.id)}>
                                                <i className="bi bi-reply-fill"></i> Add a Comment
                                            </Button>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        ))
                    )}
                </Col>

                <Col lg={4}>
                    <Card className="glass-panel border-0 text-white sticky-top" style={{ top: '20px' }}>
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-3"><i className="bi bi-info-circle-fill text-info me-2"></i> About the Forum</h5>
                            <p className="text-secondary small mb-4">
                                Welcome to the EarthScan Bharat Community Forum! This is a safe space for farmers, buyers, and agriculture experts to share knowledge, discuss current mandi prices, and ask for advice regarding crop planning and borewell drilling.
                            </p>
                            
                            <h6 className="fw-bold mb-3">Popular Categories</h6>
                            <div className="d-flex flex-wrap gap-2">
                                <Badge bg="success" className="p-2">Crop Advice</Badge>
                                <Badge bg="warning" className="p-2 text-dark">Market Prices</Badge>
                                <Badge bg="info" className="p-2">Equipment</Badge>
                                <Badge bg="primary" className="p-2">Water & Irrigation</Badge>
                                <Badge bg="secondary" className="p-2">General</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Create Post Modal */}
            <Modal show={showPostModal} onHide={() => setShowPostModal(false)} centered size="lg">
                <Modal.Header closeButton closeVariant="white" className="border-secondary px-4 py-3">
                    <Modal.Title className="fw-bold fs-5"><i className="bi bi-pencil-square text-success me-2"></i> Create a New Post</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form>
                        <Row className="g-3 mb-3">
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label className="text-secondary small fw-bold mb-2">Post Title</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="What's on your mind?"
                                        value={newPost.title}
                                        onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                                        className="bg-dark text-white border-secondary shadow-none py-2 px-3" 
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="text-secondary small fw-bold mb-2">Category</Form.Label>
                                    <Form.Select 
                                        value={newPost.category}
                                        onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                                        className="bg-dark text-white border-secondary shadow-none py-2 px-3"
                                    >
                                        <option value="General" className="bg-dark text-white">General</option>
                                        <option value="Crop Advice" className="bg-dark text-white">Crop Advice</option>
                                        <option value="Market Prices" className="bg-dark text-white">Market Prices</option>
                                        <option value="Equipment" className="bg-dark text-white">Equipment</option>
                                        <option value="Water & Irrigation" className="bg-dark text-white">Water & Irrigation</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-2">
                            <Form.Label className="text-secondary small fw-bold mb-2">Content</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={5} 
                                placeholder="Describe your question or share your experience..."
                                value={newPost.content}
                                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                                className="bg-dark text-white border-secondary shadow-none p-3" 
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-secondary px-4 py-3">
                    <Button variant="outline-secondary" className="px-4 rounded-pill" onClick={() => setShowPostModal(false)}>Cancel</Button>
                    <Button variant="success" className="px-4 rounded-pill fw-bold" onClick={handleCreatePost} disabled={submittingPost || !newPost.title || !newPost.content}>
                        {submittingPost ? 'Posting...' : 'Publish Post'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
