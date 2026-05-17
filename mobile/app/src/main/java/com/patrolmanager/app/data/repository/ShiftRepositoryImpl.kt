package com.patrolmanager.app.data.repository

import com.patrolmanager.app.data.remote.ShiftApi
import com.patrolmanager.app.data.remote.dto.*
import com.patrolmanager.app.domain.model.Shift
import com.patrolmanager.app.domain.model.WeeklySchedule
import com.patrolmanager.app.domain.repository.ShiftRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShiftRepositoryImpl @Inject constructor(
    private val shiftApi: ShiftApi,
) : ShiftRepository {

    override suspend fun getWeeklySchedule(date: String?): Result<WeeklySchedule> = runCatching {
        shiftApi.getWeeklySchedule(date).toDomain()
    }

    override suspend fun getActiveShift(): Result<Shift?> = runCatching {
        try {
            shiftApi.getActiveShift().toDomain()
        } catch (_: Exception) {
            null
        }
    }

    override suspend fun clockIn(
        siteId: Int,
        latitude: Double,
        longitude: Double,
        accuracy: Double?,
        notes: String?,
    ): Result<Shift> = runCatching {
        val response = shiftApi.clockIn(
            ClockInRequest(
                siteId = siteId,
                location = LocationDto(latitude, longitude, accuracy),
                notes = notes,
            )
        )
        if (response.success && response.shift != null) {
            response.shift.toDomain()
        } else {
            throw Exception(response.error ?: "Clock-in failed")
        }
    }

    override suspend fun clockOut(
        latitude: Double,
        longitude: Double,
        accuracy: Double?,
        notes: String?,
    ): Result<Shift> = runCatching {
        val response = shiftApi.clockOut(
            ClockOutRequest(
                location = LocationDto(latitude, longitude, accuracy),
                notes = notes,
            )
        )
        if (response.success && response.shift != null) {
            response.shift.toDomain()
        } else {
            throw Exception(response.error ?: "Clock-out failed")
        }
    }
}
