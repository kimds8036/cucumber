package expo.modules.youthpaperwidget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

object WidgetIntents {
  fun openUri(context: Context, uri: String, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    return PendingIntent.getActivity(context, requestCode, intent, flags)
  }
}
