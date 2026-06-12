import React from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { logger } from '../utils/logger';

/** 다음(카카오) 우편번호 서비스에서 선택한 주소 정보 */
export interface PostcodeResult {
  /** 우편번호 (5자리) */
  postalCode: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** 지번 주소 */
  jibunAddress: string;
}

interface PostcodeSearchProps {
  visible: boolean;
  onClose: () => void;
  onSelected: (result: PostcodeResult) => void;
}

/**
 * 다음 우편번호 서비스를 WebView로 띄워, 사용자가 선택한 주소(우편번호·도로명·지번)를
 * postMessage로 전달받는 임베드 HTML.
 *
 * postcode.v2.js의 oncomplete 콜백 데이터를 ReactNativeWebView.postMessage로 넘긴다.
 */
const DAUM_POSTCODE_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  </head>
  <body>
    <div id="wrap" style="width:100%;height:100%;"></div>
    <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
    <script>
      function post(data) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }
      new daum.Postcode({
        oncomplete: function (data) {
          post({
            type: 'SELECTED',
            postalCode: data.zonecode,
            roadAddress: data.roadAddress,
            jibunAddress: data.jibunAddress,
          });
        },
        onclose: function (state) {
          if (state === 'FORCE_CLOSE' || state === 'COMPLETE_CLOSE') {
            post({ type: 'CLOSE' });
          }
        },
        width: '100%',
        height: '100%',
      }).embed(document.getElementById('wrap'));
    </script>
  </body>
</html>
`;

/**
 * 매장 주소 입력용 다음 우편번호 검색 모달.
 *
 * 별도 API 키 없이 동작하며(다음 우편번호 서비스), 사용자가 주소를 선택하면
 * onSelected로 우편번호·도로명·지번 주소를 전달하고 모달을 닫는다.
 */
export default function PostcodeSearch({ visible, onClose, onSelected }: PostcodeSearchProps) {
  /** WebView에서 전달된 주소 선택/닫기 메시지를 처리합니다. */
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECTED') {
        onSelected({
          postalCode: data.postalCode,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress ?? '',
        });
        onClose();
      } else if (data.type === 'CLOSE') {
        onClose();
      }
    } catch (err) {
      logger.warn('[PostcodeSearch] 메시지 파싱 실패:', err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>주소 검색</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.close}>닫기</Text>
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html: DAUM_POSTCODE_HTML }}
          onMessage={handleMessage}
          style={styles.webview}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  close: { fontSize: FontSize.md, color: Colors.accent, fontWeight: '600' },
  webview: { flex: 1 },
});
