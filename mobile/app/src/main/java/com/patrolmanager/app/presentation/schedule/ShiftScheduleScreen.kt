package com.patrolmanager.app.presentation.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.patrolmanager.app.domain.model.DaySchedule
import com.patrolmanager.app.domain.model.Shift
import com.patrolmanager.app.domain.model.ShiftStatus
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShiftScheduleScreen(
    viewModel: ShiftScheduleViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Schedule") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            // Week navigator
            WeekNavigator(
                weekStart = uiState.weeklySchedule?.weekStart,
                weekEnd = uiState.weeklySchedule?.weekEnd,
                onPrevious = { viewModel.previousWeek() },
                onNext = { viewModel.nextWeek() },
                onToday = { viewModel.currentWeek() },
            )

            // Day selector strip
            if (uiState.weeklySchedule != null) {
                DaySelectorStrip(
                    days = uiState.weeklySchedule.days,
                    selectedIndex = uiState.selectedDayIndex,
                    onDaySelected = { viewModel.selectDay(it) },
                )
            }

            // Content
            when {
                uiState.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                uiState.errorMessage != null -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = uiState.errorMessage ?: "Unknown error",
                                color = MaterialTheme.colorScheme.error,
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(onClick = { viewModel.loadWeeklySchedule() }) {
                                Text("Retry")
                            }
                        }
                    }
                }

                uiState.weeklySchedule != null -> {
                    val selectedDay = uiState.weeklySchedule.days.getOrNull(uiState.selectedDayIndex)
                    if (selectedDay != null) {
                        DayShiftList(day = selectedDay)
                    }
                }
            }
        }
    }
}

@Composable
private fun WeekNavigator(
    weekStart: String?,
    weekEnd: String?,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onToday: () -> Unit,
) {
    val displayFormatter = SimpleDateFormat("MMM dd", Locale.getDefault())
    val parseFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    val label = if (weekStart != null && weekEnd != null) {
        try {
            val start = parseFormatter.parse(weekStart)
            val end = parseFormatter.parse(weekEnd)
            "${displayFormatter.format(start!!)} - ${displayFormatter.format(end!!)}"
        } catch (_: Exception) {
            "$weekStart - $weekEnd"
        }
    } else {
        "Loading..."
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        IconButton(onClick = onPrevious) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Previous week")
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = label,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            TextButton(onClick = onToday, contentPadding = PaddingValues(0.dp)) {
                Text("Today", fontSize = 12.sp)
            }
        }

        IconButton(onClick = onNext) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Next week")
        }
    }
}

@Composable
private fun DaySelectorStrip(
    days: List<DaySchedule>,
    selectedIndex: Int,
    onDaySelected: (Int) -> Unit,
) {
    val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp)
            .background(
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                RoundedCornerShape(12.dp),
            )
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        days.forEachIndexed { index, day ->
            val isSelected = index == selectedIndex
            val isToday = day.date == today
            val hasShifts = day.shifts.isNotEmpty()

            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onDaySelected(index) }
                    .padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = day.dayName.take(3),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isSelected) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Spacer(modifier = Modifier.height(2.dp))

                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(
                            when {
                                isSelected -> MaterialTheme.colorScheme.primary
                                isToday -> MaterialTheme.colorScheme.primaryContainer
                                else -> Color.Transparent
                            },
                            CircleShape,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    val dayNum = try {
                        val parts = day.date.split("-")
                        parts[2].toInt()
                    } catch (_: Exception) { 0 }

                    Text(
                        text = dayNum.toString(),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = when {
                            isSelected -> MaterialTheme.colorScheme.onPrimary
                            isToday -> MaterialTheme.colorScheme.primary
                            else -> MaterialTheme.colorScheme.onSurface
                        },
                    )
                }

                // Shift indicator dot
                Spacer(modifier = Modifier.height(2.dp))
                Box(
                    modifier = Modifier
                        .size(4.dp)
                        .background(
                            if (hasShifts) MaterialTheme.colorScheme.primary
                            else Color.Transparent,
                            CircleShape,
                        ),
                )
            }
        }
    }
}

@Composable
private fun DayShiftList(day: DaySchedule) {
    if (day.shifts.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "No shifts scheduled",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Enjoy your day off!",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                )
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(day.shifts, key = { it.id }) { shift ->
            ShiftCard(shift = shift)
        }
    }
}

@Composable
private fun ShiftCard(shift: Shift) {
    val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
    val startTime = timeFormat.format(shift.scheduledStart)
    val endTime = timeFormat.format(shift.scheduledEnd)

    val (statusColor, statusLabel) = when (shift.status) {
        ShiftStatus.SCHEDULED -> Color(0xFF2196F3) to "SCHEDULED"
        ShiftStatus.CLOCKED_IN -> Color(0xFF4CAF50) to "ACTIVE"
        ShiftStatus.CLOCKED_OUT -> Color(0xFF9E9E9E) to "COMPLETED"
        ShiftStatus.MISSED -> Color(0xFFF44336) to "MISSED"
        ShiftStatus.CANCELLED -> Color(0xFFFF9800) to "CANCELLED"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Left color indicator
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(56.dp)
                    .background(statusColor, RoundedCornerShape(2.dp)),
            )

            Spacer(modifier = Modifier.width(12.dp))

            // Main content
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = shift.siteName ?: "Site #${shift.siteId}",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "$startTime - $endTime",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    if (shift.type.value != "regular") {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = shift.type.name.lowercase().replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            // Status chip
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = statusColor.copy(alpha = 0.12f),
            ) {
                Text(
                    text = statusLabel,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = statusColor,
                    textAlign = TextAlign.Center,
                )
            }
        }

        // Notes (if any)
        if (!shift.notes.isNullOrBlank()) {
            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
            Text(
                text = shift.notes,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
