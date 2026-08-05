import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { 
    Box, 
    Card, 
    CardContent, 
    Typography, 
    TextField, 
    Button, 
    Avatar, 
    MenuItem, 
    Grid, 
    Alert, 
    CircularProgress, 
    List, 
    ListItem, 
    ListItemText, 
    ListItemIcon, 
    Divider, 
    Chip 
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import CompassCalibrationIcon from '@mui/icons-material/CompassCalibration';
import ChatIcon from '@mui/icons-material/Chat';
import ScienceIcon from '@mui/icons-material/Science';
import { validateImageFile, compressImage } from '../utils/imageUtils';

function Profile() {
    const { t, i18n } = useTranslation();
    const { user, updateUser } = useContext(AuthContext);
    
    const [profile, setProfile] = useState({
        name: '',
        phone: '',
        location: '',
        farmingInformation: '',
        role: '',
        profilePicturePath: '',
        pincode: '',
        village: '',
        taluka: '',
        district: '',
        stateName: '',
        latitude: '',
        longitude: ''
    });

    const [villages, setVillages] = useState([]);
    const [fetchingPin, setFetchingPin] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const userId = user?.id || user?.Id;

    useEffect(() => {
        if (userId) {
            fetchProfileAndHistory();
        }
    }, [userId]);

    const fetchProfileAndHistory = async () => {
        setLoading(true);
        try {
            // Fetch Profile
            const profileRes = await fetch(`${API_BASE_URL}/api/profile/${userId}`);
            if (profileRes.ok) {
                const data = await profileRes.json();
                setProfile({
                    name: data.name || '',
                    phone: data.phone || '',
                    location: data.location || '',
                    farmingInformation: data.farmingInformation || '',
                    role: data.role || '',
                    profilePicturePath: data.profilePicturePath || '',
                    pincode: data.pincode || '',
                    village: data.village || '',
                    taluka: data.taluka || '',
                    district: data.district || '',
                    stateName: data.stateName || '',
                    latitude: data.latitude || '',
                    longitude: data.longitude || ''
                });
            }

            // Fetch History
            const historyRes = await fetch(`${API_BASE_URL}/api/profile/history/${userId}`);
            if (historyRes.ok) {
                const historyData = await historyRes.json();
                setHistory(historyData);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setMessage({ type: 'error', text: t('profile.error_load', 'Failed to load profile details.') });
        } finally {
            setLoading(false);
        }
    };

    const handlePincodeChange = async (e) => {
        const val = e.target.value.replace(/\D/g, '').substring(0, 6);
        setProfile(prev => ({ ...prev, pincode: val }));
        
        if (val.length === 6) {
            setFetchingPin(true);
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
                const data = await res.json();
                if (data && data[0] && data[0].Status === 'Success') {
                    const postOffices = data[0].PostOffice;
                    const villageList = postOffices.map(po => po.Name).sort();
                    const sample = postOffices[0];
                    setVillages(villageList);
                    
                    // Geocode the first village
                    const query = `${villageList[0] || sample.Name}, ${sample.District}, ${sample.State}, India`;
                    let lat = 19.0760, lng = 72.8777; // defaults
                    try {
                        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
                        const geoRes = await fetch(geoUrl, { headers: { 'Accept-Language': 'en' } });
                        const geoData = await geoRes.json();
                        if (geoData && geoData.length > 0) {
                            lat = parseFloat(geoData[0].lat);
                            lng = parseFloat(geoData[0].lon);
                        }
                    } catch (err) {
                        console.error('Nominatim geocoding failed:', err);
                    }

                    setProfile(prev => ({
                        ...prev,
                        village: villageList[0] || sample.Name,
                        taluka: sample.Block || sample.Taluka || '',
                        district: sample.District,
                        stateName: sample.State,
                        latitude: lat,
                        longitude: lng,
                        location: `${villageList[0] || sample.Name}, ${sample.District}, ${sample.State}`
                    }));
                } else {
                    setVillages([]);
                }
            } catch (err) {
                console.error('Failed to fetch PIN details:', err);
            } finally {
                setFetchingPin(false);
            }
        }
    };

    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !userId) return;

        // Secure type/size checks
        const valError = validateImageFile(file, 5);
        if (valError) {
            setMessage({ type: 'error', text: valError });
            return;
        }

        setUploadingPhoto(true);
        let finalFile = file;
        try {
            finalFile = await compressImage(file);
        } catch (compErr) {
            console.error("Image compression failed, uploading original:", compErr);
        }

        const formData = new FormData();
        formData.append('photo', finalFile);
        formData.append('userId', userId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/profile/upload-photo`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                setProfile(prev => ({ ...prev, profilePicturePath: result.profilePicturePath }));
                updateUser(result.user);
                setMessage({ type: 'success', text: t('profile.save_success', 'Profile picture updated successfully!') });
            } else {
                setMessage({ type: 'error', text: t('profile.save_failed', 'Failed to upload profile picture.') });
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            setMessage({ type: 'error', text: t('profile.save_failed', 'Failed to upload profile picture.') });
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: userId,
                    name: profile.name,
                    phone: profile.phone,
                    location: profile.location,
                    farmingInformation: profile.farmingInformation,
                    role: profile.role,
                    email: user?.email || user?.Email || '',
                    pincode: profile.pincode,
                    village: profile.village,
                    taluka: profile.taluka,
                    district: profile.district,
                    stateName: profile.stateName,
                    latitude: profile.latitude ? parseFloat(profile.latitude) : null,
                    longitude: profile.longitude ? parseFloat(profile.longitude) : null
                })
            });

            if (response.ok) {
                const result = await response.json();
                updateUser(result.user);
                setMessage({ type: 'success', text: t('profile.save_success', 'Profile saved successfully!') });
            } else {
                setMessage({ type: 'error', text: t('profile.save_failed', 'Failed to save profile details.') });
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setMessage({ type: 'error', text: t('profile.save_failed', 'Failed to save profile details.') });
        } finally {
            setSaving(false);
        }
    };

    const getHistoryIcon = (type) => {
        switch (type) {
            case 'Disease': return <LocalFloristIcon sx={{ color: '#00e676' }} />;
            case 'Soil': return <ScienceIcon sx={{ color: '#ffeb3b' }} />;
            case 'Chat': return <ChatIcon sx={{ color: '#2979ff' }} />;
            default: return <CompassCalibrationIcon sx={{ color: '#ff9100' }} />;
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress color="success" />
            </Box>
        );
    }

    return (
        <Box sx={{ color: '#fff', p: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4, color: '#fff', borderBottom: '2px solid rgba(255,255,255,0.05)', pb: 2 }}>
                {t('profile.title', 'User Profile & Settings')}
            </Typography>

            <Grid container spacing={4}>
                {/* Profile Edit Card */}
                <Grid item xs={12} md={5}>
                    <Card sx={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '16px' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                                <Box sx={{ position: 'relative', mb: 2 }}>
                                    <Avatar 
                                        src={profile.profilePicturePath ? `${API_BASE_URL}${profile.profilePicturePath}` : undefined} 
                                        sx={{ width: 90, height: 90, bgcolor: '#00e676', border: '3px solid rgba(255,255,255,0.1)' }}
                                    >
                                        <PersonIcon sx={{ fontSize: 50, color: '#0f172a' }} />
                                    </Avatar>
                                    {uploadingPhoto && (
                                        <CircularProgress 
                                            size={90} 
                                            sx={{ position: 'absolute', top: 0, left: 0, color: '#00e676', zIndex: 1 }} 
                                        />
                                    )}
                                </Box>
                                
                                <Button
                                    variant="outlined"
                                    component="label"
                                    size="small"
                                    color="success"
                                    disabled={uploadingPhoto}
                                    sx={{ mb: 2, textTransform: 'none', borderRadius: '20px', px: 2, fontSize: '12px', color: '#00e676', borderColor: '#00e676' }}
                                >
                                    {uploadingPhoto ? t('profile.uploading', 'Uploading...') : t('profile.change_photo', 'Change Photo')}
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                    />
                                </Button>

                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{profile.name}</Typography>
                                <Typography variant="caption" sx={{ color: '#a0aec0' }}>{user?.email || user?.Email}</Typography>
                                <Chip 
                                    label={t(`sidebar.${profile.role === 'Farmer' ? 'role_farmer' : 'role_buyer'}`)} 
                                    color={profile.role === 'Farmer' ? 'success' : 'primary'} 
                                    size="small" 
                                    sx={{ mt: 1, fontWeight: 'bold' }} 
                                />
                            </Box>

                            {message.text && (
                                <Alert severity={message.type} sx={{ mb: 3, borderRadius: '8px' }}>
                                    {message.text}
                                </Alert>
                            )}

                            <form onSubmit={handleSave}>
                                <TextField
                                    fullWidth
                                    label={t('profile.label_name', 'Full Name')}
                                    variant="outlined"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    required
                                    sx={{
                                        mb: 2.5,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            '&:hover fieldset': { borderColor: '#00e676' },
                                        },
                                        '& .MuiInputLabel-root': { color: '#a0aec0' }
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    label={t('profile.label_phone', 'Phone Number')}
                                    variant="outlined"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    sx={{
                                        mb: 2.5,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            '&:hover fieldset': { borderColor: '#00e676' },
                                        },
                                        '& .MuiInputLabel-root': { color: '#a0aec0' }
                                    }}
                                />

                                 <TextField
                                    fullWidth
                                    label={t('profile.label_pincode', 'Pincode')}
                                    variant="outlined"
                                    value={profile.pincode}
                                    onChange={handlePincodeChange}
                                    placeholder="e.g. 411001"
                                    helperText={fetchingPin ? "Fetching village list..." : ""}
                                    sx={{
                                        mb: 2.5,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            '&:hover fieldset': { borderColor: '#00e676' },
                                        },
                                        '& .MuiInputLabel-root': { color: '#a0aec0' },
                                        '& .MuiFormHelperText-root': { color: '#00e676' }
                                    }}
                                />

                                {villages.length > 0 ? (
                                    <TextField
                                        fullWidth
                                        select
                                        label={t('profile.label_village', 'Village / Area')}
                                        value={profile.village}
                                        onChange={(e) => setProfile({ ...profile, village: e.target.value, location: `${e.target.value}, ${profile.district}, ${profile.stateName}` })}
                                        sx={{
                                            mb: 2.5,
                                            '& .MuiOutlinedInput-root': {
                                                color: '#fff',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                                '&:hover fieldset': { borderColor: '#00e676' },
                                            },
                                            '& .MuiInputLabel-root': { color: '#a0aec0' }
                                        }}
                                    >
                                        {villages.map((v, i) => (
                                            <MenuItem key={i} value={v}>{v}</MenuItem>
                                        ))}
                                    </TextField>
                                ) : (
                                    <TextField
                                        fullWidth
                                        label={t('profile.label_village', 'Village / Area')}
                                        variant="outlined"
                                        value={profile.village}
                                        onChange={(e) => setProfile({ ...profile, village: e.target.value, location: `${e.target.value}, ${profile.district}, ${profile.stateName}` })}
                                        placeholder="e.g. Rampur"
                                        sx={{
                                            mb: 2.5,
                                            '& .MuiOutlinedInput-root': {
                                                color: '#fff',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                                '&:hover fieldset': { borderColor: '#00e676' },
                                            },
                                            '& .MuiInputLabel-root': { color: '#a0aec0' }
                                        }}
                                    />
                                )}

                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            disabled
                                            label={t('profile.label_taluka', 'Taluka')}
                                            variant="outlined"
                                            value={profile.taluka}
                                            sx={{
                                                mb: 2.5,
                                                '& .MuiOutlinedInput-root': {
                                                    color: '#fff',
                                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                                },
                                                '& .MuiInputLabel-root': { color: 'rgba(160, 174, 192, 0.5)' }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            disabled
                                            label={t('profile.label_district', 'District')}
                                            variant="outlined"
                                            value={profile.district}
                                            sx={{
                                                mb: 2.5,
                                                '& .MuiOutlinedInput-root': {
                                                    color: '#fff',
                                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                                },
                                                '& .MuiInputLabel-root': { color: 'rgba(160, 174, 192, 0.5)' }
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                <TextField
                                    fullWidth
                                    disabled
                                    label={t('profile.label_state', 'State')}
                                    variant="outlined"
                                    value={profile.stateName}
                                    sx={{
                                        mb: 2.5,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                        },
                                        '& .MuiInputLabel-root': { color: 'rgba(160, 174, 192, 0.5)' }
                                    }}
                                />

                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            disabled
                                            label={t('profile.label_latitude', 'Latitude')}
                                            variant="outlined"
                                            value={profile.latitude}
                                            sx={{
                                                mb: 2.5,
                                                '& .MuiOutlinedInput-root': {
                                                    color: '#fff',
                                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                                },
                                                '& .MuiInputLabel-root': { color: 'rgba(160, 174, 192, 0.5)' }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            disabled
                                            label={t('profile.label_longitude', 'Longitude')}
                                            variant="outlined"
                                            value={profile.longitude}
                                            sx={{
                                                mb: 2.5,
                                                '& .MuiOutlinedInput-root': {
                                                    color: '#fff',
                                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                                },
                                                '& .MuiInputLabel-root': { color: 'rgba(160, 174, 192, 0.5)' }
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                <TextField
                                    fullWidth
                                    select
                                    label={t('profile.label_role', 'Your Primary Role')}
                                    value={profile.role}
                                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                                    sx={{
                                        mb: 2.5,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            '&:hover fieldset': { borderColor: '#00e676' },
                                        },
                                        '& .MuiInputLabel-root': { color: '#a0aec0' }
                                    }}
                                >
                                    <MenuItem value="Farmer">{t('sidebar.role_farmer', 'Farmer')}</MenuItem>
                                    <MenuItem value="Land Buyer">{t('sidebar.role_buyer', 'Land Buyer')}</MenuItem>
                                </TextField>

                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label={profile.role === 'Farmer' ? t('profile.label_farm_info', 'Farming Bio / Details') : t('profile.label_buyer_info', 'Investment Interests / Bio')}
                                    variant="outlined"
                                    value={profile.farmingInformation}
                                    onChange={(e) => setProfile({ ...profile, farmingInformation: e.target.value })}
                                    sx={{
                                        mb: 3,
                                        '& .MuiOutlinedInput-root': {
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            '&:hover fieldset': { borderColor: '#00e676' },
                                        },
                                        '& .MuiInputLabel-root': { color: '#a0aec0' }
                                    }}
                                />

                                <Button 
                                    type="submit" 
                                    fullWidth 
                                    variant="contained" 
                                    color="success" 
                                    disabled={saving}
                                    sx={{ py: 1.5, fontWeight: 'bold', textTransform: 'none', borderRadius: '8px', fontSize: '16px' }}
                                >
                                    {saving ? <CircularProgress size={24} color="inherit" /> : t('profile.save_btn', 'Save Profile')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Search & Activity History Timeline */}
                <Grid item xs={12} md={7}>
                    <Card sx={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '16px' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <HistoryIcon sx={{ color: '#00e676', fontSize: 30 }} />
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{t('profile.history_title', 'Activity & Search History')}</Typography>
                            </Box>

                            {history.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 6, color: '#a0aec0' }}>
                                    <Typography variant="body1">{t('profile.no_history', 'No search or activity logs found.')}</Typography>
                                </Box>
                            ) : (
                                <List sx={{ width: '100%' }}>
                                    {history.map((item, index) => (
                                        <React.Fragment key={item.id}>
                                            <ListItem alignItems="flex-start" sx={{ px: 0, py: 2 }}>
                                                <ListItemIcon sx={{ minWidth: '46px', mt: 0.5 }}>
                                                    {getHistoryIcon(item.type)}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                                                                {item.title}
                                                            </Typography>
                                                            <Chip 
                                                                label={item.category} 
                                                                size="small" 
                                                                sx={{ 
                                                                    fontSize: '11px', 
                                                                    height: '20px', 
                                                                    bgcolor: 'rgba(255,255,255,0.05)', 
                                                                    color: '#a0aec0', 
                                                                    border: '1px solid rgba(255,255,255,0.05)' 
                                                                }} 
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                            <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                                                                {item.description}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                                                                {new Date(item.date).toLocaleString('en-IN', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {index < history.length - 1 && (
                                                <Divider variant="inset" component="li" sx={{ borderColor: 'rgba(255,255,255,0.05)', ml: 6 }} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Profile;
