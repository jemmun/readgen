import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useReaderSettings } from '../contexts/ReaderSettingsContext';

interface ChapterRendererProps {
  content: string;
}

function textToHtml(text: string): string {
  // Escape HTML special chars
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Split by double newlines to create paragraphs
  const paragraphs = html.split(/\n\n+/);
  const wrapped = paragraphs
    .map((p) => {
      // Replace single newlines within paragraph with <br>
      const withBr = p.replace(/\n/g, '<br>');
      return `<p>${withBr}</p>`;
    })
    .join('\n');

  return wrapped;
}

export default function ChapterRenderer({ content }: ChapterRendererProps) {
  const { settings } = useReaderSettings();

  if (Platform.OS === 'web') {
    const html = textToHtml(content);
    const fontFamily = settings.fontFamily === 'System' ? 'system-ui, -apple-system, sans-serif' : settings.fontFamily;

    return (
      <View style={styles.webContainer}>
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          style={{
            fontSize: settings.fontSize,
            fontFamily,
            color: settings.textColor,
            lineHeight: settings.lineHeight,
            textAlign: 'justify',
          }}
        />
        <style>{`
          p {
            margin: 0 0 ${settings.paragraphSpacing}px 0;
            text-indent: 2em;
          }
          p:last-child {
            margin-bottom: 0;
          }
        `}</style>
      </View>
    );
  }

  // Native rendering: split into paragraphs
  const paragraphs = content.split(/\n\n+/);
  const fontFamily = settings.fontFamily === 'System' ? undefined : settings.fontFamily;

  return (
    <View style={styles.nativeContainer}>
      {paragraphs.map((paragraph, index) => {
        // Replace single newlines within paragraph with spaces for native
        const text = paragraph.replace(/\n/g, ' ');
        return (
          <Text
            key={index}
            style={{
              fontSize: settings.fontSize,
              fontFamily,
              color: settings.textColor,
              lineHeight: settings.fontSize * settings.lineHeight,
              marginBottom: index < paragraphs.length - 1 ? settings.paragraphSpacing : 0,
              textAlign: 'justify',
            }}
          >
            {'　　' + text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    width: '100%',
  },
  nativeContainer: {
    width: '100%',
  },
});
