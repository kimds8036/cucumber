# 핸드폰(공기계) 서버 설정 가이드

공기계에 Termux만 설치된 상태에서 처음부터 설정하는 방법입니다.

## 1단계: Termux 기본 설정

### 필수 패키지 설치
```bash
# 패키지 목록 업데이트
pkg update
pkg upgrade -y

# 필수 도구 설치
pkg install git curl wget -y
```

## 2단계: Node.js 설치

```bash
# Node.js 설치 (Termux에서는 nvm 또는 직접 설치)
pkg install nodejs npm -y

# 설치 확인
node --version
npm --version
```

## 3단계: Git 설정 (프로젝트 받기)

```bash
# Git 사용자 정보 설정 (한 번만)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 프로젝트 폴더 생성
cd ~
mkdir projects
cd projects

# Git 저장소 클론 (또는 이미 있으면)
# git clone https://github.com/yourusername/cucumber.git
# 또는 이미 저장소가 있으면
cd cucumber
```

**또는 컴퓨터에서 이미 작업 중이면:**
```bash
# 컴퓨터에서 Git 저장소를 만들어서 push 후
cd ~
git clone [저장소 URL]
cd cucumber/back
```

## 4단계: MySQL/MariaDB 설치

```bash
# MariaDB 설치 (MySQL보다 가볍고 Termux에서 잘 동작)
pkg install mariadb -y

# MariaDB 초기화 (첫 설치 시 한 번만)
mysql_install_db

# MariaDB 서버 시작
mysqld_safe &

# 몇 초 기다린 후 MySQL 접속 (초기에는 비밀번호 없음)
mysql -u root
```

**MySQL 내부에서 실행할 명령어:**
```sql
-- 비밀번호 설정 (원하는 비밀번호로 변경하세요)
ALTER USER 'root'@'localhost' IDENTIFIED BY 'cucumber123';

-- 데이터베이스 생성
CREATE DATABASE cucumber_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 확인
SHOW DATABASES;

-- 종료
EXIT;
```

## 5단계: 프로젝트 설정

```bash
# back 폴더로 이동
cd ~/projects/cucumber/back
# 또는
cd ~/cucumber/back

# 의존성 설치
npm install

# .env 파일 생성
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=cucumber123
DB_NAME=cucumber_db

PORT=3000
NODE_ENV=development

JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
EOF

# .env 파일 확인
cat .env
```

## 6단계: 데이터베이스 마이그레이션 실행

```bash
# MariaDB가 실행 중인지 확인 (안 되어 있으면)
mysqld_safe &

# 마이그레이션 실행
npm run migrate
```

## 7단계: 서버 실행

```bash
# 개발 모드로 실행
npm run dev

# 또는 프로덕션 모드
npm start
```

서버가 실행되면 `http://localhost:3000` 또는 `http://[핸드폰IP]:3000`으로 접속 가능합니다.

## 8단계: SSH 서버 설정 (컴퓨터에서 접속하기 위해)

```bash
# SSH 서버 설치
pkg install openssh -y

# SSH 서버 시작
sshd

# 사용자 이름 확인
whoami

# 비밀번호 설정
passwd
```

**핸드폰 IP 주소 확인:**
```bash
ifconfig | grep inet
# 또는
ip addr show | grep inet
```

**컴퓨터에서 접속:**
```bash
# 같은 Wi-Fi 네트워크에 있어야 합니다
ssh [위에서 확인한 사용자명]@[핸드폰IP주소]
# 예: ssh u0_a123@192.168.0.10
```

## 일상적인 작업 흐름

### 컴퓨터에서 코드 수정 후:
1. 컴퓨터: `git add .`
2. 컴퓨터: `git commit -m "변경사항"`
3. 컴퓨터: `git push`

### 핸드폰에서 코드 받기:
```bash
cd ~/projects/cucumber/back  # 프로젝트 폴더로 이동
git pull  # 최신 코드 받기
npm install  # 새 패키지가 있으면 설치

# 서버 재시작 (이미 실행 중이면 Ctrl+C로 중지 후)
npm run dev
```

### DB 확인하기 (핸드폰에서 간단하게):
```bash
# MariaDB 접속
mysql -u root -p
# 비밀번호 입력

# 데이터베이스 선택
USE cucumber_db;

# 테이블 확인
SHOW TABLES;

# 간단한 조회
SELECT * FROM users LIMIT 5;
SELECT COUNT(*) FROM posts;

# 종료
EXIT;
```

### DB 확인하기 (컴퓨터에서 SSH로 접속):
```bash
# 컴퓨터 터미널에서
ssh [사용자명]@[핸드폰IP]

# SSH 접속 후
mysql -u root -p
# 비밀번호 입력 후 위와 동일하게 사용
```

## 자주 사용하는 명령어

### MariaDB 시작/중지
```bash
# 시작
mysqld_safe &

# 중지 (프로세스 찾아서 종료)
pkill mysqld
```

### 서버 실행
```bash
# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

### 로그 확인
```bash
# 서버 로그는 터미널에 직접 출력됨
# 백그라운드 실행하려면
nohup npm start > server.log 2>&1 &

# 로그 확인
tail -f server.log
```

## 문제 해결

### MariaDB가 시작 안 될 때
```bash
# 프로세스 확인
ps aux | grep mysql

# 기존 프로세스 종료
pkill mysqld

# 다시 시작
mysqld_safe &
```

### 포트가 이미 사용 중일 때
```bash
# 3000번 포트 사용 중인 프로세스 확인
lsof -i :3000

# 또는 .env에서 다른 포트 사용
# PORT=3001
```

### Git 연결 문제
```bash
# 저장소 상태 확인
git status

# 원격 저장소 확인
git remote -v

# 원격 저장소 추가 (필요시)
git remote add origin [저장소URL]
```

## 참고사항

- **Wi-Fi 연결 필수**: SSH 접속이나 외부에서 접근하려면 핸드폰과 컴퓨터가 같은 Wi-Fi에 있어야 합니다
- **배터리 관리**: 항상 켜두려면 충전 필요
- **Termux 백그라운드**: Termux는 앱을 종료해도 백그라운드에서 실행됩니다
- **재부팅 시**: 핸드폰 재부팅 후에는 MariaDB와 서버를 다시 시작해야 합니다
