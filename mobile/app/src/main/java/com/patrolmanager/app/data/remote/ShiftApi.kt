package com.patrolmanager.app.data.remote

import com.patrolmanager.app.data.remote.dto.*
import retrofit2.http.*

interface ShiftApi {

    @GET("shifts/scheduled")
    suspend fun getWeeklySchedule(@Query("date") date: String? = null): WeeklyScheduleResponse

    @GET("shifts/active")
    suspend fun getActiveShift(): ShiftDto

    @POST("shifts/clock-in")
    suspend fun clockIn(@Body request: ClockInRequest): ClockInResponse

    @POST("shifts/clock-out")
    suspend fun clockOut(@Body request: ClockOutRequest): ClockOutResponse
}
