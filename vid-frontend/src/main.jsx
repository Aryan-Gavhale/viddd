import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { HelmetProvider } from "react-helmet-async";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./i18n/index.js";
import store from "./redux/store.js";
import { selectResolvedTheme } from "./redux/preferencesSlice.js";
import AppearanceProvider from "./Providers/AppearanceProvider.jsx";
import UILocalizationProvider from "./Providers/UILocalizationProvider.jsx";
import "./index.css";
import App from "./App.jsx";

function ThemedToastContainer() {
  const theme = useSelector(selectResolvedTheme);
  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={theme === "dark" ? "dark" : "light"}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HelmetProvider>
      <Provider store={store}>
        <AppearanceProvider>
          <UILocalizationProvider>
            <App />
            <ThemedToastContainer />
          </UILocalizationProvider>
        </AppearanceProvider>
      </Provider>
    </HelmetProvider>
  </StrictMode>
);
