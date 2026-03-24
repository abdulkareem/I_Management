# Internship Management Backend Rebuild

## Modular structure

```
src/
├── modules/
│   ├── auth/
│   ├── college/
│   ├── department/
│   ├── coordinator/
│   ├── student/
│   ├── industry/
│   ├── internship/
│   ├── application/
│   └── attendance/
├── controllers/
├── services/
├── repositories/
├── routes/
├── middlewares/
├── utils/
└── prisma/schema.prisma
```

## Migration commands

```bash
cd backend
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB" npx prisma generate
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB" npx prisma migrate dev --name init_internship_platform
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB" npx prisma db seed
```

## Railway production database sync

Use the same `DATABASE_URL` value configured for the backend service. In Railway shell:

```bash
cd /app/backend
echo "$DATABASE_URL"
npx prisma db push
npx prisma studio
```

Verify the following models are present in Prisma Studio for the same database:

- `User`
- `College`
- `Industry`
- `Internship`

## Role redirects after login

- STUDENT -> `/dashboard/student`
- INDUSTRY -> `/dashboard/industry`
- COLLEGE -> `/dashboard/college`
- COORDINATOR -> `/dashboard/coordinator`

## Sample API request and response

### POST `/api/college/create`

Request:

```json
{
  "collegeName": "IIT Demo College",
  "emblemUrl": "https://cdn.example.com/emblems/iit.png",
  "createdBy": {
    "name": "College Admin",
    "email": "college-admin@iit.demo",
    "password": "Password@123"
  },
  "departments": [
    {
      "name": "Computer Science",
      "coordinator": {
        "name": "Dr. Lakshmi",
        "email": "coord-cse@iit.demo",
        "password": "Password@123",
        "phone": "+1-202-555-0111"
      }
    },
    {
      "name": "Mechanical",
      "coordinator": {
        "name": "Dr. Arun",
        "email": "coord-me@iit.demo",
        "password": "Password@123",
        "phone": "+1-202-555-0133"
      }
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "clg_abc123",
    "name": "IIT Demo College",
    "emblemUrl": "https://cdn.example.com/emblems/iit.png",
    "createdById": "usr_abc123",
    "createdAt": "2026-03-24T07:30:00.000Z"
  }
}
```
