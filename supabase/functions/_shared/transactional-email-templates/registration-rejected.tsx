import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "SKILL LEVEL 38"

interface Props {
  fullName?: string
  reviewComment?: string
}

const RegistrationRejectedEmail = ({ fullName, reviewComment }: Props) => (
  <Html lang="vi" dir="ltr">
    <Head />
    <Preview>Yêu cầu đăng ký tài khoản của bạn không được phê duyệt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Yêu cầu đăng ký không được phê duyệt</Heading>
        <Text style={text}>
          Xin chào {fullName || 'bạn'},
        </Text>
        <Text style={text}>
          Rất tiếc, yêu cầu đăng ký tài khoản trên hệ thống <strong>{SITE_NAME}</strong> của bạn đã không được phê duyệt.
        </Text>
        {reviewComment && (
          <>
            <Text style={labelText}>Lý do:</Text>
            <Text style={reasonBox}>{reviewComment}</Text>
          </>
        )}
        <Text style={text}>
          Nếu bạn có thắc mắc, vui lòng liên hệ phòng Tổ chức Tổng hợp để được hỗ trợ.
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
  component: RegistrationRejectedEmail,
  subject: 'Yêu cầu đăng ký không được phê duyệt - SKILL LEVEL 38',
  displayName: 'Từ chối đăng ký',
  previewData: { fullName: 'Nguyễn Văn A', reviewComment: 'Thông tin chưa đầy đủ, vui lòng đăng ký lại.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a2744', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const labelText = { fontSize: '14px', color: '#374151', fontWeight: '600' as const, margin: '0 0 4px' }
const reasonBox = { fontSize: '14px', color: '#991b1b', lineHeight: '1.6', margin: '0 0 16px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '6px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
