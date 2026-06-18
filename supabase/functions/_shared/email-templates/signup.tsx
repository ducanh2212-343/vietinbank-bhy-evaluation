/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="vi" dir="ltr">
    <Head />
    <Preview>Xác nhận email của bạn cho {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Xác nhận email</Heading>
        <Text style={text}>
          Cảm ơn bạn đã đăng ký tài khoản tại{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>!
        </Text>
        <Text style={text}>
          Vui lòng xác nhận địa chỉ email (<Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>) bằng cách nhấn nút bên dưới:
        </Text>
        <Button style={button} href={confirmationUrl}>Xác nhận Email</Button>
        <Text style={footer}>Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 40%, 13%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(215, 16%, 47%)', lineHeight: '1.5', margin: '0 0 25px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(220, 60%, 22%)', color: 'hsl(210, 40%, 98%)', fontSize: '14px', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
