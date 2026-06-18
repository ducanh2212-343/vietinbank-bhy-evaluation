import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "SKILL LEVEL 38"

interface Props {
  fullName?: string
  email?: string
  tempPasswordHint?: string
}

const RegistrationApprovedEmail = ({ fullName, email, tempPasswordHint }: Props) => (
  <Html lang="vi" dir="ltr">
    <Head />
    <Preview>Yêu cầu đăng ký tài khoản của bạn đã được phê duyệt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Tài khoản đã được phê duyệt</Heading>
        <Text style={text}>
          Xin chào {fullName || 'bạn'},
        </Text>
        <Text style={text}>
          Yêu cầu đăng ký tài khoản trên hệ thống <strong>{SITE_NAME}</strong> của bạn đã được phê duyệt thành công.
        </Text>
        <Text style={text}>
          <strong>Email đăng nhập:</strong> {email || '(email đã đăng ký)'}
        </Text>
        {tempPasswordHint && (
          <Text style={text}>
            <strong>Mật khẩu tạm thời:</strong> {tempPasswordHint}
          </Text>
        )}
        <Text style={textWarning}>
          Vui lòng đăng nhập và đổi mật khẩu ngay sau lần đăng nhập đầu tiên để đảm bảo bảo mật tài khoản.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Trân trọng, Đội ngũ {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RegistrationApprovedEmail,
  subject: 'Tài khoản đã được phê duyệt - SKILL LEVEL 38',
  displayName: 'Phê duyệt đăng ký',
  previewData: { fullName: 'Nguyễn Văn A', email: 'nguyenvana@example.com', tempPasswordHint: '8 số cuối SĐT' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2744', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const textWarning = { fontSize: '14px', color: '#b45309', lineHeight: '1.6', margin: '0 0 16px', backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
