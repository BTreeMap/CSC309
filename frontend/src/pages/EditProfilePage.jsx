import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, useToast } from '../components/shared';
import './EditProfilePage.css';

const EditProfilePage = () => {
    const { user, updateUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        birthday: user?.birthday ? user.birthday.split('T')[0] : '',
    });
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        if (formData.name && (formData.name.length < 1 || formData.name.length > 50)) {
            newErrors.name = 'Name must be between 1 and 50 characters';
        }

        if (formData.email && !formData.email.match(/^[^\s@]+@(mail\.)?utoronto\.ca$/)) {
            newErrors.email = 'Email must be a valid UofT email address';
        }

        if (formData.birthday) {
            const date = new Date(formData.birthday);
            if (isNaN(date.getTime())) {
                newErrors.birthday = 'Invalid date format';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showError('Avatar image must be less than 5MB');
                return;
            }
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const updateData = {};
            if (formData.name !== user?.name) updateData.name = formData.name;
            if (formData.email !== user?.email) updateData.email = formData.email;
            if (formData.birthday) updateData.birthday = formData.birthday;
            if (avatar) updateData.avatar = avatar;

            if (Object.keys(updateData).length === 0) {
                showError('No changes to save');
                setLoading(false);
                return;
            }

            const updatedUser = await usersAPI.updateMe(updateData);
            updateUser(updatedUser);
            showSuccess('Profile updated successfully');
            navigate('/profile');
        } catch (error) {
            showError(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <Layout>
                <LoadingSpinner text="Loading profile..." />
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="edit-profile-page">
                <div className="edit-profile-header">
                    <h1>Edit Profile</h1>
                    <p>Update your personal information</p>
                </div>

                <form onSubmit={handleSubmit} className="edit-profile-form">
                    <div className="avatar-section">
                        <div className="avatar-preview">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar preview" />
                            ) : (
                                <span>{user?.name?.charAt(0)?.toUpperCase() || user?.utorid?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                        </div>
                        <div className="avatar-upload">
                            <label htmlFor="avatar" className="avatar-upload-button">
                                Choose Photo
                            </label>
                            <input
                                type="file"
                                id="avatar"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="avatar-input"
                            />
                            <p className="avatar-hint">JPG, PNG or GIF. Max size 5MB</p>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="utorid" className="form-label">UTORid</label>
                        <input
                            type="text"
                            id="utorid"
                            className="form-input input-disabled"
                            value={user?.utorid || ''}
                            disabled
                        />
                        <span className="input-hint">UTORid cannot be changed</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="name" className="form-label">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            maxLength={50}
                        />
                        {errors.name && <span className="input-error">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="example@mail.utoronto.ca"
                        />
                        {errors.email && <span className="input-error">{errors.email}</span>}
                        <span className="input-hint">Must be a valid UofT email address</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="birthday" className="form-label">Birthday</label>
                        <input
                            type="date"
                            id="birthday"
                            name="birthday"
                            className="form-input"
                            value={formData.birthday}
                            onChange={handleChange}
                        />
                        {errors.birthday && <span className="input-error">{errors.birthday}</span>}
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/profile')}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default EditProfilePage;
