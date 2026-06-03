import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { TextInput, Button, Text, HelperText, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { novelsApi } from '../api/novels';
import { useI18n } from '../i18n/I18nContext';
import { Language } from '../i18n/translations';
import { NOVEL_GENRES, NovelGenre, getGenreByKey } from '../utils/novelGenres';

type CreateNovelNavigationProp = StackNavigationProp<RootStackParamList, 'CreateNovel'>;
type CreateNovelRouteProp = RouteProp<RootStackParamList, 'CreateNovel'>;

interface Props {
  navigation: CreateNovelNavigationProp;
}

export default function CreateNovelScreen({ navigation }: Props) {
  const { t, setLanguage } = useI18n();
  const route = useRoute<CreateNovelRouteProp>();
  const params = route.params;
  const isEditing = !!params?.novelId;

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? t('editNovelDesign') : t('createNovel') });
  }, [navigation, t, isEditing]);
  const [language, setLocalLanguage] = useState<Language>((params?.language as Language) || 'en');
  const [title, setTitle] = useState(params?.title || '');
  const [theme, setTheme] = useState(params?.theme_description || '');
  const [genre, setGenre] = useState(params?.genre || '');
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [selectedGenreObj, setSelectedGenreObj] = useState<NovelGenre | null>(
    params?.genre ? getGenreByKey(params.genre) || null : null
  );
  const [style, setStyle] = useState(params?.style || '');
  const [targetAudience, setTargetAudience] = useState(params?.target_audience || '');
  const [protagonist, setProtagonist] = useState(params?.protagonist_info || '');
  const [setting, setSetting] = useState(params?.setting || '');
  const [tone, setTone] = useState(params?.tone || '');
  const [maxChapters, setMaxChapters] = useState(String(params?.max_chapters || 20));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!title.trim()) return t('titleRequired');
    if (!theme.trim()) return t('themeDescriptionRequired');
    return '';
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    const data = {
      title,
      theme_description: theme,
      genre: genre || undefined,
      style: style || undefined,
      target_audience: targetAudience || undefined,
      protagonist_info: protagonist || undefined,
      setting: setting || undefined,
      tone: tone || undefined,
      language,
      max_chapters: parseInt(maxChapters) || 20,
    };

    try {
      if (isEditing && params?.novelId) {
        await novelsApi.update(params.novelId, data);
        navigation.replace('NovelDetail', { novelId: params.novelId });
      } else {
        const novelResponse = await novelsApi.create(data);
        const novel = novelResponse.data;
        navigation.replace('NovelDetail', { novelId: novel.id });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || t('createFailed'));
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.header}>
        {isEditing ? t('editNovelDesign') : t('phase1Title')}
      </Text>
      <Text variant="bodyMedium" style={styles.subheader}>
        {isEditing ? t('editNovelDesignHint') : t('phase1Subtitle')}
      </Text>

      <Text variant="titleSmall" style={styles.sectionLabel}>{t('language')}</Text>
      <SegmentedButtons
        value={language}
        onValueChange={(value) => {
          setLocalLanguage(value as Language);
          setLanguage(value as Language);
        }}
        buttons={[
          { value: 'en', label: t('english') },
          { value: 'zh', label: t('chinese') },
        ]}
        style={styles.segmentedButtons}
      />

      <TextInput
        label={`${t('title')} *`}
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label={`${t('themeDescription')} *`}
        value={theme}
        onChangeText={setTheme}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={4}
        placeholder={t('themePlaceholder')}
      />

      <TouchableOpacity
        style={[styles.input, styles.genreSelector]}
        onPress={() => setShowGenreModal(true)}
      >
        <Text variant="labelMedium" style={styles.genreLabel}>
          {t('genre')}
        </Text>
        {selectedGenreObj ? (
          <View style={styles.genreSelected}>
            <Text style={styles.genreEmoji}>{selectedGenreObj.emoji}</Text>
            <Text style={styles.genreText}>
              {language === 'zh' ? selectedGenreObj.labelZh : selectedGenreObj.labelEn}
            </Text>
          </View>
        ) : (
          <Text style={styles.genrePlaceholderText}>{t('selectGenre')}</Text>
        )}
      </TouchableOpacity>
      <HelperText type="info" style={styles.helperText}>
        {t('genreHint')}
      </HelperText>

      <TextInput
        label={t('writingStyle')}
        value={style}
        onChangeText={setStyle}
        style={styles.input}
        mode="outlined"
        placeholder={t('stylePlaceholder')}
      />

      <TextInput
        label={t('targetAudience')}
        value={targetAudience}
        onChangeText={setTargetAudience}
        style={styles.input}
        mode="outlined"
        placeholder={t('audiencePlaceholder')}
      />

      <TextInput
        label={t('protagonist')}
        value={protagonist}
        onChangeText={setProtagonist}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={2}
        placeholder={t('protagonistPlaceholder')}
      />

      <TextInput
        label={t('setting')}
        value={setting}
        onChangeText={setSetting}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={2}
        placeholder={t('settingPlaceholder')}
      />

      <TextInput
        label={t('tone')}
        value={tone}
        onChangeText={setTone}
        style={styles.input}
        mode="outlined"
        placeholder={t('tonePlaceholder')}
      />

      <TextInput
        label={t('maxChapters')}
        value={maxChapters}
        onChangeText={setMaxChapters}
        style={styles.input}
        mode="outlined"
        keyboardType="numeric"
      />

      {error ? <HelperText type="error">{error}</HelperText> : null}

      <Button
        mode="contained"
        onPress={handleSave}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        {loading ? t('saving') : isEditing ? t('saveChanges') : t('saveNovelDesign')}
      </Button>

      {/* Genre Selection Modal */}
      <Modal
        visible={showGenreModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {t('selectGenre')}
              </Text>
              <TouchableOpacity onPress={() => setShowGenreModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={NOVEL_GENRES}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.genreItem,
                    genre === item.key && styles.genreItemSelected,
                  ]}
                  onPress={() => {
                    setGenre(item.key);
                    setSelectedGenreObj(item);
                    setShowGenreModal(false);
                  }}
                >
                  <Text style={styles.genreItemEmoji}>{item.emoji}</Text>
                  <View style={styles.genreItemInfo}>
                    <Text style={styles.genreItemLabel}>
                      {language === 'zh' ? item.labelZh : item.labelEn}
                    </Text>
                    <Text style={styles.genreItemDesc}>
                      {language === 'zh' ? item.descriptionZh : item.descriptionEn}
                    </Text>
                  </View>
                  {genre === item.key && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    overflow: 'scroll',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subheader: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 8,
  },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 4,
    fontWeight: 'bold',
    color: '#333',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  genreSelector: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#fff',
    minHeight: 60,
    justifyContent: 'center',
  },
  genreLabel: {
    color: '#666',
    marginBottom: 4,
  },
  genreSelected: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  genreText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  genrePlaceholderText: {
    fontSize: 16,
    color: '#999',
  },
  helperText: {
    marginTop: -8,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 8,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  genreItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  genreItemEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  genreItemInfo: {
    flex: 1,
  },
  genreItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  genreItemDesc: {
    fontSize: 14,
    color: '#666',
  },
  checkMark: {
    fontSize: 24,
    color: '#1d9bf0',
    fontWeight: '700',
  },
});
