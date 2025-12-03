import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner } from '../components/shared';
import { useToast } from '../components/shared/ToastContext';
import './EditProfilePage.css';

const EditProfilePage = () => {
    const { t } = useTranslation(['users', 'common']);
    const { user, updateUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

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
            newErrors.name = t('edit.validation.nameLength');
        }

        if (formData.email && !formData.email.match(/^[^\s@]+@(mail\.)?utoronto\.ca$/)) {
            newErrors.email = t('edit.validation.invalidEmail');
        }

        if (formData.birthday) {
            const date = new Date(formData.birthday);
            if (isNaN(date.getTime())) {
                newErrors.birthday = t('edit.validation.invalidDate');
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
                showToast(t('edit.avatarTooLarge'), 'error');
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
                showToast(t('edit.noChanges'), 'error');
                setLoading(false);
                return;
            }

            const updatedUser = await usersAPI.updateMe(updateData);
            updateUser(updatedUser);
            showToast(t('edit.success'), 'success');
            navigate('/profile');
        } catch (error) {
            showToast(error.response?.data?.error || t('edit.error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <Layout>
                <LoadingSpinner text={t('edit.loading')} />
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="edit-profile-page">
                <div className="page-header">
                    <h1 className="page-title">{t('edit.title')}</h1>
                    <p className="page-subtitle">{t('edit.subtitle')}</p>
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
                                {t('edit.choosePhoto')}
                            </label>
                            <input
                                type="file"
                                id="avatar"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="avatar-input"
                            />
                            <p className="avatar-hint">{t('edit.avatarHint')}</p>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="utorid" className="form-label">{t('profile.utorid')}</label>
                        <input
                            type="text"
                            id="utorid"
                            className="form-input input-disabled"
                            value={user?.utorid || ''}
                            disabled
                        />
                        <span className="input-hint">{t('edit.utoridCannotChange')}</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="name" className="form-label">{t('edit.nameLabel')}</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t('edit.namePlaceholder')}
                            maxLength={50}
                        />
                        {errors.name && <span className="input-error">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">{t('edit.emailLabel')}</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder={t('edit.emailPlaceholder')}
                        />
                        {errors.email && <span className="input-error">{errors.email}</span>}
                        <span className="input-hint">{t('edit.emailHint')}</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="birthday" className="form-label">{t('edit.birthdayLabel')}</label>
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
                            {t('common:cancel')}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? t('edit.submitting') : t('edit.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default EditProfilePage;
