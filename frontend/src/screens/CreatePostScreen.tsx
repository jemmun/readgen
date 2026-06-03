import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, Image } from 'react-native';
import { Text, TextInput, ActivityIndicator, Icon } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { postsApi } from '../api/posts';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';
import * as ImagePicker from 'expo-image-picker';

type CreatePostScreenProps = StackScreenProps<RootStackParamList, 'CreatePost'>;

export default function CreatePostScreen({ navigation }: CreatePostScreenProps) {
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tag, setTag] = useState('');
  const [error, setError] = useState('');
  
  // Privacy toggles
  const [allowComments, setAllowComments] = useState(true);
  const [allowRepost, setAllowRepost] = useState(true);
  const [allowShare, setAllowShare] = useState(true);

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to upload images.'
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      // Upload image immediately
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    setError('');
    
    try {
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await postsApi.uploadImage(formData);
      setImageUrl(response.data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload image');
      setImageUri(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setImageUrl(null);
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }
    if (uploading) {
      setError('Please wait for image upload to complete');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await postsApi.create({
        content,
        image_url: imageUrl || undefined,
        tag: tag.trim() || undefined,
        allow_comments: allowComments,
        allow_repost: allowRepost,
        allow_share: allowShare,
      });
      navigation.goBack();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.composer}>
          <Text style={styles.title}>New Post</Text>
          <Text style={styles.hint}>
            Share an idea, story seed, or creative thought. Others can comment and collaborate.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            label="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            style={styles.input}
            mode="outlined"
            outlineColor={XColors.border}
            activeOutlineColor={XColors.primary}
            textColor={XColors.textPrimary}
          />

          {/* Image Upload Section */}
          <Text style={styles.sectionTitle}>Image (optional)</Text>
          
          {imageUri ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                <Icon source="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Icon source="image-plus" size={40} color={XColors.primary} />
              <Text style={styles.imagePickerText}>Add Image</Text>
              <Text style={styles.imagePickerHint}>Tap to select from gallery</Text>
            </TouchableOpacity>
          )}

          <TextInput
            label="Tag (optional)"
            value={tag}
            onChangeText={setTag}
            style={styles.input}
            mode="outlined"
            outlineColor={XColors.border}
            activeOutlineColor={XColors.primary}
            textColor={XColors.textSecondary}
            placeholder="e.g. plot, character"
          />

          {/* Privacy Toggles */}
          <Text style={styles.sectionTitle}>Post Settings</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Allow Comments</Text>
              <Text style={styles.toggleDesc}>Others can reply to this post</Text>
            </View>
            <Switch
              value={allowComments}
              onValueChange={setAllowComments}
              trackColor={{ false: '#c4c4c4', true: XColors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Allow Reposting</Text>
              <Text style={styles.toggleDesc}>Others can repost or forward to groups</Text>
            </View>
            <Switch
              value={allowRepost}
              onValueChange={setAllowRepost}
              trackColor={{ false: '#c4c4c4', true: XColors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Allow Sharing</Text>
              <Text style={styles.toggleDesc}>Share to social media platforms</Text>
            </View>
            <Switch
              value={allowShare}
              onValueChange={setAllowShare}
              trackColor={{ false: '#c4c4c4', true: XColors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePublish}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: XColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  composer: {
    padding: XSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  title: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    marginBottom: XSpacing.sm,
  },
  hint: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    marginBottom: XSpacing.lg,
  },
  input: {
    marginBottom: XSpacing.lg,
    backgroundColor: XColors.background,
    fontSize: XTypography.bodyLarge.fontSize,
    lineHeight: XTypography.bodyLarge.lineHeight,
  },
  button: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...XTypography.titleLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
  error: {
    ...XTypography.bodySmall,
    color: XColors.error,
    marginBottom: XSpacing.md,
  },
  // Privacy toggles
  sectionTitle: {
    ...XTypography.bodyLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.md,
    marginTop: XSpacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: XSpacing.sm,
    paddingHorizontal: XSpacing.sm,
    backgroundColor: '#f7f9f9',
    borderRadius: XBorderRadius.md,
    marginBottom: XSpacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: XSpacing.md,
  },
  toggleLabel: {
    ...XTypography.bodyMedium,
    color: XColors.textPrimary,
    fontWeight: '600',
  },
  toggleDesc: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: 2,
  },
  // Image upload styles
  imagePreview: {
    position: 'relative',
    marginBottom: XSpacing.lg,
    borderRadius: XBorderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: XBorderRadius.lg,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    ...XTypography.bodyMedium,
    color: '#ffffff',
    marginTop: XSpacing.sm,
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: XColors.primary,
    borderStyle: 'dashed',
    borderRadius: XBorderRadius.lg,
    padding: XSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: XSpacing.lg,
    backgroundColor: 'rgba(29, 155, 240, 0.05)',
  },
  imagePickerText: {
    ...XTypography.bodyLarge,
    color: XColors.primary,
    fontWeight: '600',
    marginTop: XSpacing.sm,
  },
  imagePickerHint: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: 4,
  },
});
