package com.patrolmanager.app.data.remote.dto

import com.google.gson.annotations.SerializedName
import com.patrolmanager.app.domain.model.*
import java.text.SimpleDateFormat
import java.util.Locale

data class GpsLocationDto(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double? = null,
) {
    fun toDomain() = GpsLocation(latitude, longitude, accuracy)
}

data class ShiftDto(
    val id: Int,
    val siteId: Int,
    val guardId: Int,
    val status: String,
    val type: String,
    val scheduledStart: String,
    val scheduledEnd: String,
    val actualStart: String? = null,
    val actualEnd: String? = null,
    val clockInLocation: GpsLocationDto? = null,
    val clockOutLocation: GpsLocationDto? = null,
    val notes: String? = null,
    val missedReason: String? = null,
    val siteName: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
) {
    fun toDomain(): Shift {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        return Shift(
            id = id,
            siteId = siteId,
            guardId = guardId,
            status = ShiftStatus.fromValue(status),
            type = ShiftType.fromValue(type),
            scheduledStart = parser.parse(scheduledStart) ?: java.util.Date(),
            scheduledEnd = parser.parse(scheduledEnd) ?: java.util.Date(),
            actualStart = actualStart?.let { parser.parse(it) },
            actualEnd = actualEnd?.let { parser.parse(it) },
            clockInLocation = clockInLocation?.toDomain(),
            clockOutLocation = clockOutLocation?.toDomain(),
            notes = notes,
            missedReason = missedReason,
            siteName = siteName,
            createdAt = createdAt?.let { parser.parse(it) },
            updatedAt = updatedAt?.let { parser.parse(it) },
        )
    }
}

data class DayScheduleDto(
    val date: String,
    val dayName: String,
    val shifts: List<ShiftDto>,
) {
    fun toDomain() = DaySchedule(
        date = date,
        dayName = dayName,
        shifts = shifts.map { it.toDomain() },
    )
}

data class WeeklyScheduleResponse(
    val weekStart: String,
    val weekEnd: String,
    val days: List<DayScheduleDto>,
) {
    fun toDomain() = WeeklySchedule(
        weekStart = weekStart,
        weekEnd = weekEnd,
        days = days.map { it.toDomain() },
    )
}

data class LocationDto(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double? = null,
)

data class ClockInRequest(
    val guardId: Int? = null,
    val siteId: Int,
    val location: LocationDto,
    val notes: String? = null,
)

data class ClockOutRequest(
    val guardId: Int? = null,
    val location: LocationDto,
    val notes: String? = null,
)

data class ClockInResponse(
    val success: Boolean,
    val shift: ShiftDto? = null,
    val error: String? = null,
    val warning: String? = null,
    val isLate: Boolean = false,
    val minutesLate: Double? = null,
    val isWithinGeofence: Boolean = true,
)

data class ClockOutResponse(
    val success: Boolean,
    val shift: ShiftDto? = null,
    val error: String? = null,
    val duration: DurationInfo? = null,
)

data class DurationInfo(
    val scheduled: Double,
    val actual: Double,
    val overtime: Double,
)
