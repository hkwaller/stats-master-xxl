package app.playam.statsmaster;

import android.app.Activity;
import android.content.Context;
import android.hardware.display.DisplayManager;
import android.os.Build;
import android.view.Display;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.function.Consumer;

/** Fail closed when recording detection is unavailable. Never present on a TV. */
@CapacitorPlugin(name = "AdPresentation")
public class AdPresentationPlugin extends Plugin {
    private boolean captured = true;
    private Consumer<Integer> recordingCallback;

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= 35) {
                try {
                    recordingCallback = state -> captured = state == WindowManager.SCREEN_RECORDING_STATE_VISIBLE;
                    int state = getActivity().getWindowManager().addScreenRecordingCallback(getContext().getMainExecutor(), recordingCallback);
                    captured = state == WindowManager.SCREEN_RECORDING_STATE_VISIBLE;
                } catch (Exception ignored) { captured = true; }
            }
        });
    }

    @PluginMethod
    public void context(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Activity activity = getActivity();
            DisplayManager manager = (DisplayManager) activity.getSystemService(Context.DISPLAY_SERVICE);
            boolean external = manager == null || manager.getDisplays().length != 1;
            Display display = activity.getWindow().getDecorView().getDisplay();
            boolean allowed = !captured && !external && display != null && display.getDisplayId() == Display.DEFAULT_DISPLAY
                && !activity.isFinishing() && !activity.isDestroyed() && activity.hasWindowFocus();
            JSObject result = new JSObject();
            result.put("allowed", allowed);
            call.resolve(result);
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (Build.VERSION.SDK_INT >= 35 && recordingCallback != null) {
            getActivity().getWindowManager().removeScreenRecordingCallback(recordingCallback);
        }
        super.handleOnDestroy();
    }
}
