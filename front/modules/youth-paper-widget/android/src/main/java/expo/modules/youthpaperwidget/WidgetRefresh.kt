package expo.modules.youthpaperwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock

class WidgetRefreshReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    WidgetUpdater.reloadAll(context)
    WidgetRefreshScheduler.schedule(context)
  }
}

object WidgetRefreshScheduler {
  private const val ACTION = "expo.modules.youthpaperwidget.ACTION_REFRESH"
  private const val REQ = 77

  fun schedule(context: Context) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = pending(context)
    val now = SystemClock.elapsedRealtime()
    val nextPeriod = TimetableLogic.nextRefreshAt(context)
    val delay = (nextPeriod - System.currentTimeMillis()).coerceIn(60_000L, 30 * 60 * 1000L)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, now + delay, pi)
      } else {
        am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, now + delay, pi)
      }
    } catch (_: SecurityException) {
      am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, now + delay, pi)
    }
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
