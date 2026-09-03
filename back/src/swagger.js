/**
 * OpenAPI 3.0 스펙 (Swagger UI용)
 */
const PORT = process.env.PORT || 3000;

export default {
  openapi: '3.0.3',
  info: {
    title: 'Cucumber API',
    description: 'Cucumber 백엔드 API 문서',
    version: '1.0.0',
  },
  servers: [
    { url: `http://localhost:${PORT}`, description: '로컬 개발 서버' },
  ],
  tags: [
    { name: '공통', description: '헬스체크 등' },
    { name: '인증', description: '로그인, 회원가입, 전화번호 인증' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['공통'],
        summary: '서버 상태 확인',
        responses: {
          200: {
            description: '서버 정상',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/send-verification': {
      post: {
        tags: ['인증'],
        summary: '전화번호 인증 코드 발송',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: {
                  phone: { type: 'string', example: '01012345678', description: '전화번호' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '인증 코드 발송 성공', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          400: { description: '잘못된 요청', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/verify-phone': {
      post: {
        tags: ['인증'],
        summary: '전화번호 인증 코드 확인',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'verificationCode'],
                properties: {
                  phone: { type: 'string', example: '01012345678' },
                  verificationCode: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '인증 완료', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          400: { description: '코드 불일치 또는 만료', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/check-phone-available': {
      post: {
        tags: ['인증'],
        summary: '회원가입 전 전화번호 중복 확인',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: {
                  phone: { type: 'string', example: '01012345678' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '확인 완료' },
        },
      },
    },
    '/api/auth/verify-firebase-phone': {
      post: {
        tags: ['인증'],
        summary: 'Firebase Phone Auth ID Token 검증 및 phone_verifications 기록',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken', 'phone'],
                properties: {
                  idToken: { type: 'string', description: 'Firebase Phone Auth ID Token' },
                  phone: { type: 'string', example: '01012345678', description: '가입 화면 입력 번호 (토큰과 교차 검증)' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '인증 완료', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: '토큰 무효', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/signup': {
      post: {
        tags: ['인증'],
        summary: '회원가입',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'name', 'phone', 'birthDate', 'schoolId', 'grade', 'classNumber', 'colorId'],
                properties: {
                  username: { type: 'string', description: '사용자명(아이디)', example: 'user1' },
                  password: { type: 'string', format: 'password', description: '비밀번호 (영문+숫자 8자 이상)' },
                  name: { type: 'string', example: '홍길동' },
                  phone: { type: 'string', example: '01012345678', description: '인증 완료된 전화번호' },
                  birthDate: { type: 'string', example: '2005-01-15', description: '생년월일' },
                  schoolId: { type: 'integer', example: 1, description: '학교 ID' },
                  grade: { type: 'integer', example: 3, description: '학년' },
                  classNumber: { type: 'integer', example: 2, description: '반' },
                  colorId: { type: 'integer', example: 1, description: '컬러 ID (colors 테이블)' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: '회원가입 완료',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { type: 'object', properties: { userId: { type: 'integer' } } },
                  },
                },
              },
            },
          },
          400: { description: '검증 실패 또는 전화번호 미인증', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['인증'],
        summary: '로그인',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'user1' },
                  password: { type: 'string', format: 'password' },
                  deviceId: { type: 'string', description: '선택) 디바이스 ID' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '로그인 성공',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', description: 'JWT 토큰' },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            username: { type: 'string' },
                            name: { type: 'string' },
                          },
                        },
                        needsVerification: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: '아이디/비밀번호 불일치', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['인증'],
        summary: '로그아웃',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { deviceId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: '로그아웃 완료', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: '토큰 없음/만료', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/verify-student': {
      post: {
        tags: ['인증'],
        summary: '학생 인증',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'schoolId', 'grade', 'classNumber'],
                properties: {
                  name: { type: 'string' },
                  schoolId: { type: 'integer' },
                  grade: { type: 'integer' },
                  classNumber: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '학생 인증 완료', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          400: { description: '정보 불일치', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: '인증 필요', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/ocr': {
      post: {
        tags: ['인증'],
        summary: 'OCR 학생증 인증',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  imageUrl: { type: 'string' },
                  ocrData: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OCR 인증 결과', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: '인증 필요', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '로그인 후 받은 JWT 토큰',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          message: { type: 'string' },
        },
      },
      SuccessMessage: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', description: '에러 메시지' },
        },
      },
    },
  },
};
