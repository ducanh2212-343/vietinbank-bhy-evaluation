/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="vi" dir="ltr">
    <Head />
    <Preview>Mã xác thực của bạn</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Xác thực lại tài khoản</Heading>
        <Text style={text}>Sử dụng mã bên dưới để xác nhận danh tính của bạn:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>Mã này sẽ hết hạn trong thời gian ngắn. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 40%, 13%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(215, 16%, 47%)', lineHeight: '1.5', margin: '0 0 25px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 40%, 13%)', margin: '0 0 30px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
