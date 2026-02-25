package com.patrolmanager.app.data.remote

import retrofit2.http.*

interface ShiftApi {
    @GET("shifts")
    suspend fun getShifts(): ApiResponse<List<ShiftDto>>

    @POST("shifts/clock-in")
    suspend fun clockIn(@Body location: LocationDto): ApiResponse<ShiftDto>

    @POST("shifts/clock-out")
    suspend fun clockOut(@Body location: LocationDto): ApiResponse<ShiftDto>

    @GET("shifts/active")
    suspend fun getActiveShift(): ApiResponse<ShiftDto>
}
