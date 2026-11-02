package app.playam.statsmaster;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdPresentationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
