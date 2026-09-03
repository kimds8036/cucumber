package expo.modules.youthpaperwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log

class WidgetRefreshReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    WidgetUpdater.reloadAll(context)
    WidgetRefreshScheduler.schedule(context)
  }
}

object WidgetRefreshScheduler {
  private const val TAG = "YouthPaperWidget"
  private const val ACTION = "expo.modules.youthpaperwidget.ACTION_REFRESH"
  private const val REQ = 77
  private const val MAX_DELAY_MS = 30 * 60 * 1000L

  fun schedule(context: Context) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = pending(context)
    val rawDelay = TimetableLogic.nextRefreshAt(context) - System.currentTimeMillis()
    if (rawDelay <= 0) {
      WidgetUpdater.reloadAll(context)
    }
    val delay = rawDelay.coerceIn(0L, MAX_DELAY_MS)
    val triggerElapsed = SystemClock.elapsedRealtime() + delay
    try {
      if (canExact(am)) {
        am.setExactAndAllowWhileIdle(
          AlarmManager.ELAPSED_REALTIME_WAKEUP,
          triggerElapsed,
          pi,
        )
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        am.setAndAllowWhileIdle(
          AlarmManager.ELAPSED_REALTIME_WAKEUP,
          triggerElapsed,
          pi,
        )
      } else {
        am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerElapsed, pi)
      }
    } catch (e: SecurityException) {
      Log.w(TAG, "exact alarm blocked, fallback inexact", e)
      am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerElapsed, pi)
    }
  }

  private fun canExact(am: AlarmManager): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return am.canScheduleExactAlarms()
    }
    return true
  }

  private fun pending(context: Context): PendingIntent {
    val intent = Intent(context, WidgetRefreshReceiver::class.java).setAction(ACTION)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    return PendingIntent.getBroadcast(context, REQ, intent, flags)
  }
}

object WidgetUpdater {
  fun reloadAll(context: Context) {
    MealWidgetViews.updateAll(context)
    TimetableWidgetViews.updateAll(context)
  }
}
