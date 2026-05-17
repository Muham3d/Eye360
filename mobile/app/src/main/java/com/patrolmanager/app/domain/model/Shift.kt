package com.patrolmanager.app.domain.model

import java.util.Date

enum class ShiftStatus(val value: String) {
    SCHEDULED("scheduled"),
    CLOCKED_IN("clocked_in"),
    CLOCKED_OUT("clocked_out"),
    MISSED("missed"),
    CANCELLED("cancelled");

    companion object {
        fun fromValue(value: String): ShiftStatus =
            entries.find { it.value == value } ?: SCHEDULED
    }
}

enum class ShiftType(val value: String) {
    REGULAR("regular"),
    OVERTIME("overtime"),
    EMERGENCY("emergency"),
    TRAINING("training");

    companion object {
        fun fromValue(value: String): ShiftType =
            entries.find { it.value == value } ?: REGULAR
    }
}

data class GpsLocation(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double? = null,
)

data class Shift(
    val id: Int,
    val siteId: Int,
    val guardId: Int,
    val status: ShiftStatus,
    val type: ShiftType,
    val scheduledStart: Date,
    val scheduledEnd: Date,
    val actualStart: Date? = null,
    val actualEnd: Date? = null,
    val clockInLocation: GpsLocation? = null,
    val clockOutLocation: GpsLocation? = null,
    val notes: String? = null,
    val missedReason: String? = null,
    val siteName: String? = null,
    val createdAt: Date? = null,
    val updatedAt: Date? = null,
)

data class DaySchedule(
    val date: String,
    val dayName: String,
    val shifts: List<Shift>,
)

data class WeeklySchedule(
    val weekStart: String,
    val weekEnd: String,
    val days: List<DaySchedule>,
)
