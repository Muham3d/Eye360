package com.patrolmanager.app.presentation.schedule

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.patrolmanager.app.domain.model.DaySchedule
import com.patrolmanager.app.domain.model.WeeklySchedule
import com.patrolmanager.app.domain.repository.ShiftRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import javax.inject.Inject

data class ScheduleUiState(
    val isLoading: Boolean = false,
    val weeklySchedule: WeeklySchedule? = null,
    val selectedDayIndex: Int = 0,
    val errorMessage: String? = null,
)

@HiltViewModel
class ShiftScheduleViewModel @Inject constructor(
    private val shiftRepository: ShiftRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScheduleUiState())
    val uiState: StateFlow<ScheduleUiState> = _uiState.asStateFlow()

    private var currentWeekOffset = 0

    init {
        loadWeeklySchedule()
    }

    fun loadWeeklySchedule(weekOffset: Int = currentWeekOffset) {
        currentWeekOffset = weekOffset
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            val date = if (weekOffset == 0) {
                null
            } else {
                val cal = Calendar.getInstance()
                cal.add(Calendar.WEEK_OF_YEAR, weekOffset)
                val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                fmt.format(cal.time)
            }

            shiftRepository.getWeeklySchedule(date)
                .onSuccess { schedule ->
                    val todayIndex = findTodayIndex(schedule)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        weeklySchedule = schedule,
                        selectedDayIndex = todayIndex,
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Failed to load schedule",
                    )
                }
        }
    }

    fun selectDay(index: Int) {
        _uiState.value = _uiState.value.copy(selectedDayIndex = index)
    }

    fun previousWeek() {
        loadWeeklySchedule(currentWeekOffset - 1)
    }

    fun nextWeek() {
        loadWeeklySchedule(currentWeekOffset + 1)
    }

    fun currentWeek() {
        currentWeekOffset = 0
        loadWeeklySchedule(0)
    }

    private fun findTodayIndex(schedule: WeeklySchedule): Int {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)
        val index = schedule.days.indexOfFirst { it.date == today }
        return if (index >= 0) index else 0
    }
}
