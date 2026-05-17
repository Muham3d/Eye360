package com.patrolmanager.app.domain.repository

import com.patrolmanager.app.domain.model.Shift
import com.patrolmanager.app.domain.model.WeeklySchedule

interface ShiftRepository {
    suspend fun getWeeklySchedule(date: String? = null): Result<WeeklySchedule>
    suspend fun getActiveShift(): Result<Shift?>
    suspend fun clockIn(siteId: Int, latitude: Double, longitude: Double, accuracy: Double?, notes: String?): Result<Shift>
    suspend fun clockOut(latitude: Double, longitude: Double, accuracy: Double?, notes: String?): Result<Shift>
}
