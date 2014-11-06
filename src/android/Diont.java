package net.willemmulder.diont.cordova;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.InetAddress;
import java.net.MulticastSocket;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;
import org.json.JSONException;

import android.util.SparseArray;

public class Diont extends CordovaPlugin {

    SparseArray<MulticastSocket> sockets;
    SparseArray<SocketListener> listeners;

    public Diont() {
        sockets = new SparseArray<MulticastSocket>();
        listeners = new SparseArray<SocketListener>();
    }

    @Override
    public boolean execute(String action, JSONArray data, CallbackContext callbackContext) throws JSONException {
        
        final int instanceId = data.getInt(0);
        MulticastSocket socket = sockets.get(instanceId);

        if (action.equals("init")) {
            if (socket == null) {
                try {
                    String host = data.getString(1);
                    int port = data.getInt(2);

                    socket = new MulticastSocket(port);
                    socket.setTimeToLive(1); // Local network
                    socket.joinGroup(InetAddress.getByName(host)); // Tell the OS to listen for messages on the specified host and treat them as if they were meant for this host
                    Boolean disableLoopback = false;
                    socket.setLoopbackMode(disableLoopback);

                    sockets.put(instanceId, socket);
                    callbackContext.success();
                } catch (Exception e) {
                    callbackContext.error(e.toString());
                }
            }
        } else if (action.equals("listen")) {
            try {
                // Set up listener
                SocketListener listener = new SocketListener(socket, callbackContext);
                listeners.put(instanceId, listener);
                listener.start();
            } catch (Exception e) {
                callbackContext.error(e.toString());
            }
        }  else if (action.equals("send")) {
            String message = data.getString(1);
            String host = data.getString(2);
            int port = data.getInt(3);

            try {
                byte[] bytes = message.getBytes("UTF-8");
                DatagramPacket packet = new DatagramPacket(bytes, bytes.length, InetAddress.getByName(host), port);
                socket.send(packet);
                callbackContext.success(message);
            } catch (IOException ioe) {
                callbackContext.error("IOException: " + ioe.toString());
            }
        } else if (action.equals("close")) {
            if (socket != null) {
                socket.close();
                sockets.remove(instanceId);
                SocketListener listener = listeners.get(instanceId);
                if (listener != null) {
                    listener.interrupt();
                    listeners.remove(instanceId);
                }
            }
            callbackContext.success();
        } else {
            return false; // 'MethodNotFound'
        }
        return true;
    }

    private class SocketListener extends Thread {

        MulticastSocket socket;
        PluginResult result;
        CallbackContext callbackContext;

        public SocketListener(MulticastSocket socket, CallbackContext callbackContextParam) {
            this.socket = socket;
            callbackContext = callbackContextParam;
        }

        public void run() {
            byte[] data = new byte[2048];
            DatagramPacket packet = new DatagramPacket(data, data.length);
            while (true) {
                try {
                    this.socket.receive(packet);
                    String msg = new String(data, 0, packet.getLength(), "UTF-8")
                                    .replace("'", "\'")
                                    .replace("\r", "\\r")
                                    .replace("\n", "\\n");

                    result = new PluginResult(PluginResult.Status.OK, msg);
                    result.setKeepCallback(true); // Allow for additional callbacks
                    callbackContext.sendPluginResult(result);

                } catch (Exception e) {
                    return;
                }
            }
        }
    }

}