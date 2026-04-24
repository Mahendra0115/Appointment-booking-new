# Appointment Booking System

Public NestJS API for doctor appointment booking with automatic next-available-day suggestions.

## What Changed

The old auth-heavy workflow has been replaced with a simpler clinic booking flow focused on:

- doctor configuration
- daily slot generation
- patient booking by phone number
- automatic next available day search when today is full

## Core Features

- Configure doctor name and specialization
- Configure available days and weekly off days
- Configure consulting start time, end time, and slot duration
- Auto-calculate daily slots or cap them with a manual daily appointment limit
- Check today’s schedule first
- If today is full, automatically suggest the first open slot on the next available working day
- Return a clinic-facing fallback message when no slot is available in the next configured days

## API Base URL

```text
http://localhost:3000/api/v1
```

## Endpoints

### 1. Create Doctor

`POST /api/doctors`

Postman raw body:

```json
{
  "doctorName": "Dr. Meera Sharma",
  "specialization": "Cardiology",
  "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
  "weeklyOffDays": ["SUNDAY"],
  "consultingStartTime": "09:00",
  "consultingEndTime": "17:00",
  "slotDurationMinutes": 15,
  "nextAvailableSearchDays": 7
}
```

Sample response:

```json
{
  "success": true,
  "message": "Doctor created successfully",
  "data": {
    "id": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
    "doctorName": "Dr. Meera Sharma",
    "specialization": "Cardiology",
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
    "weeklyOffDays": ["SUNDAY"],
    "consultingStartTime": "09:00:00",
    "consultingEndTime": "17:00:00",
    "slotDurationMinutes": 15,
    "totalAppointmentsPerDay": null,
    "autoCalculatedTotalSlots": 32,
    "totalSlotsPerDay": 32,
    "nextAvailableSearchDays": 7,
    "createdAt": "2026-04-22T10:30:00.000Z",
    "updatedAt": "2026-04-22T10:30:00.000Z"
  }
}
```

### 2. List Doctors

`GET /api/doctors`

Sample response:

```json
{
  "success": true,
  "message": "Doctors fetched successfully",
  "data": [
    {
      "id": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
      "doctorName": "Dr. Meera Sharma",
      "specialization": "Cardiology",
      "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      "weeklyOffDays": ["SUNDAY"],
      "consultingStartTime": "09:00:00",
      "consultingEndTime": "17:00:00",
      "slotDurationMinutes": 15,
      "totalAppointmentsPerDay": null,
      "autoCalculatedTotalSlots": 32,
      "totalSlotsPerDay": 32,
      "nextAvailableSearchDays": 7,
      "createdAt": "2026-04-22T10:30:00.000Z",
      "updatedAt": "2026-04-22T10:30:00.000Z"
    }
  ]
}
```

### 3. Get Doctor By Id

`GET /api/doctors/:doctorId`

Sample response:

```json
{
  "success": true,
  "message": "Doctor fetched successfully",
  "data": {
    "id": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
    "doctorName": "Dr. Meera Sharma",
    "specialization": "Cardiology",
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
    "weeklyOffDays": ["SUNDAY"],
    "consultingStartTime": "09:00:00",
    "consultingEndTime": "17:00:00",
    "slotDurationMinutes": 15,
    "totalAppointmentsPerDay": null,
    "autoCalculatedTotalSlots": 32,
    "totalSlotsPerDay": 32,
    "nextAvailableSearchDays": 7,
    "createdAt": "2026-04-22T10:30:00.000Z",
    "updatedAt": "2026-04-22T10:30:00.000Z"
  }
}
```

### 4. Update Doctor

`PATCH /api/doctors/:doctorId`

Postman raw body:

```json
{
  "specialization": "Senior Cardiology Consultant",
  "totalAppointmentsPerDay": 20,
  "nextAvailableSearchDays": 10
}
```

Sample response:

```json
{
  "success": true,
  "message": "Doctor updated successfully",
  "data": {
    "id": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
    "doctorName": "Dr. Meera Sharma",
    "specialization": "Senior Cardiology Consultant",
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
    "weeklyOffDays": ["SUNDAY"],
    "consultingStartTime": "09:00:00",
    "consultingEndTime": "17:00:00",
    "slotDurationMinutes": 15,
    "totalAppointmentsPerDay": 20,
    "autoCalculatedTotalSlots": 32,
    "totalSlotsPerDay": 20,
    "nextAvailableSearchDays": 10,
    "createdAt": "2026-04-22T10:30:00.000Z",
    "updatedAt": "2026-04-22T10:45:00.000Z"
  }
}
```

### 5. Check Availability

`GET /api/doctors/:doctorId/availability?date=2026-04-22&daysToSearch=7`

If slots are available on the requested date:

```json
{
  "success": true,
  "message": "Doctor availability fetched successfully",
  "data": {
    "doctor": {
      "id": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
      "doctorName": "Dr. Meera Sharma",
      "specialization": "Cardiology",
      "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      "weeklyOffDays": ["SUNDAY"],
      "consultingStartTime": "09:00:00",
      "consultingEndTime": "17:00:00",
      "slotDurationMinutes": 15,
      "totalAppointmentsPerDay": null,
      "autoCalculatedTotalSlots": 32,
      "totalSlotsPerDay": 32,
      "nextAvailableSearchDays": 7,
      "createdAt": "2026-04-22T10:30:00.000Z",
      "updatedAt": "2026-04-22T10:30:00.000Z"
    },
    "requestedDate": "2026-04-22",
    "nextAvailableDate": "2026-04-22",
    "nextAvailableSlot": {
      "startTime": "11:00",
      "endTime": "11:15"
    },
    "searchedDays": 1,
    "message": "Appointments are available today on 2026-04-22.",
    "schedule": {
      "date": "2026-04-22",
      "isWorkingDay": true,
      "totalSlots": 32,
      "bookedSlots": 10,
      "availableSlots": 22,
      "slots": [
        {
          "startTime": "11:00",
          "endTime": "11:15"
        },
        {
          "startTime": "11:15",
          "endTime": "11:30"
        }
      ]
    }
  }
}
```

If today is full and the system finds the next available day:

```json
{
  "success": true,
  "message": "Doctor availability fetched successfully",
  "data": {
    "doctor": {
      "id": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
      "doctorName": "Dr. Meera Sharma",
      "specialization": "Cardiology",
      "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      "weeklyOffDays": ["SUNDAY"],
      "consultingStartTime": "09:00:00",
      "consultingEndTime": "17:00:00",
      "slotDurationMinutes": 15,
      "totalAppointmentsPerDay": null,
      "autoCalculatedTotalSlots": 32,
      "totalSlotsPerDay": 32,
      "nextAvailableSearchDays": 7,
      "createdAt": "2026-04-22T10:30:00.000Z",
      "updatedAt": "2026-04-22T10:30:00.000Z"
    },
    "requestedDate": "2026-04-22",
    "nextAvailableDate": "2026-04-23",
    "nextAvailableSlot": {
      "startTime": "09:00",
      "endTime": "09:15"
    },
    "searchedDays": 2,
    "message": "No appointments available today. Next available appointment is on 2026-04-23 at 09:00.",
    "schedule": {
      "date": "2026-04-23",
      "isWorkingDay": true,
      "totalSlots": 32,
      "bookedSlots": 5,
      "availableSlots": 1,
      "slots": [
        {
          "startTime": "09:00",
          "endTime": "09:15"
        }
      ]
    }
  }
}
```

If no slot is found in the next configured days:

```json
{
  "success": true,
  "message": "Doctor availability fetched successfully",
  "data": {
    "doctor": {
      "id": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
      "doctorName": "Dr. Meera Sharma",
      "specialization": "Cardiology",
      "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      "weeklyOffDays": ["SUNDAY"],
      "consultingStartTime": "09:00:00",
      "consultingEndTime": "17:00:00",
      "slotDurationMinutes": 15,
      "totalAppointmentsPerDay": null,
      "autoCalculatedTotalSlots": 32,
      "totalSlotsPerDay": 32,
      "nextAvailableSearchDays": 7,
      "createdAt": "2026-04-22T10:30:00.000Z",
      "updatedAt": "2026-04-22T10:30:00.000Z"
    },
    "requestedDate": "2026-04-22",
    "nextAvailableDate": null,
    "nextAvailableSlot": null,
    "searchedDays": 7,
    "message": "No appointments available in the next 7 days. Please contact clinic.",
    "schedule": {
      "date": "2026-04-22",
      "isWorkingDay": true,
      "totalSlots": 32,
      "bookedSlots": 32,
      "availableSlots": 0,
      "slots": []
    }
  }
}
```

### 6. Book Appointment

`POST /api/appointments`

Postman raw body:

```json
{
  "doctorId": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
  "patientPhoneNumber": "9876543210",
  "patientName": "Rahul Verma",
  "reasonForVisit": "Chest pain follow-up",
  "appointmentDate": "2026-04-23",
  "slotStartTime": "09:15"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "id": "8c0c65ca-896b-4bd7-bf74-ec2a64efb228",
    "doctorId": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
    "doctorName": "Dr. Meera Sharma",
    "patientPhoneNumber": "9876543210",
    "patientName": "Rahul Verma",
    "reasonForVisit": "Chest pain follow-up",
    "appointmentDate": "2026-04-23",
    "slotStartTime": "09:15:00",
    "slotEndTime": "09:30:00",
    "status": "BOOKED",
    "createdAt": "2026-04-22T11:00:00.000Z",
    "updatedAt": "2026-04-22T11:00:00.000Z"
  }
}
```

If the selected slot is no longer available:

```json
{
  "statusCode": 400,
  "message": {
    "message": "Selected slot is not available on 2026-04-22.",
    "nextAvailableDate": "2026-04-23",
    "nextAvailableSlot": {
      "startTime": "09:00",
      "endTime": "09:15"
    }
  },
  "error": "Bad Request"
}
```

### 7. List Appointments

`GET /api/appointments`

Optional filters:

- `doctorId`
- `appointmentDate`

Example:

`GET /api/appointments?doctorId=f219e00b-f598-4e5a-a816-d94b9b326ebf&appointmentDate=2026-04-23`

Sample response:

```json
{
  "success": true,
  "message": "Appointments fetched successfully",
  "data": [
    {
      "id": "8c0c65ca-896b-4bd7-bf74-ec2a64efb228",
      "doctorId": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
      "doctorName": "Dr. Meera Sharma",
      "patientPhoneNumber": "9876543210",
      "patientName": "Rahul Verma",
      "reasonForVisit": "Chest pain follow-up",
      "appointmentDate": "2026-04-23",
      "slotStartTime": "09:15:00",
      "slotEndTime": "09:30:00",
      "status": "BOOKED",
      "createdAt": "2026-04-22T11:00:00.000Z",
      "updatedAt": "2026-04-22T11:00:00.000Z"
    }
  ]
}
```

### 8. Get Appointment By Id

`GET /api/appointments/:appointmentId`

Sample response:

```json
{
  "success": true,
  "message": "Appointment fetched successfully",
  "data": {
    "id": "8c0c65ca-896b-4bd7-bf74-ec2a64efb228",
    "doctorId": "f219e00b-f598-4e5a-a816-d94b9b326ebf",
    "doctorName": "Dr. Meera Sharma",
    "patientPhoneNumber": "9876543210",
    "patientName": "Rahul Verma",
    "reasonForVisit": "Chest pain follow-up",
    "appointmentDate": "2026-04-23",
    "slotStartTime": "09:15:00",
    "slotEndTime": "09:30:00",
    "status": "BOOKED",
    "createdAt": "2026-04-22T11:00:00.000Z",
    "updatedAt": "2026-04-22T11:00:00.000Z"
  }
}
```

## Booking Flow

1. Create doctor configuration.
2. Call `GET /api/doctors/:doctorId/availability`.
3. If today has slots, book one of the returned slots.
4. If today is full, use `nextAvailableDate` and `nextAvailableSlot`.
5. Submit the selected slot using `POST /api/appointments`.

## Notes

- `patientPhoneNumber` is the required patient identifier.
- `patientName` and `reasonForVisit` are optional.
- Sunday is the default weekly off day if you do not send `weeklyOffDays`.
- `totalAppointmentsPerDay` is optional. If omitted, all generated slots are allowed.
- The system skips non-working days while searching for the next available day.

## Run

```bash
npm install
npm run start:dev
```
