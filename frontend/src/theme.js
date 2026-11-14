import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",

    primary: {
      main: "#3949AB",
      light: "#6573C3",
      dark: "#283593",
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: "#00897B",
      light: "#4DB6AC",
      dark: "#00695C",
      contrastText: "#FFFFFF",
    },

    background: {
      default: "#F5F6FA",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#202333",
      secondary: "#73788C",
    },

    error: {
      main: "#D32F2F",
    },

    success: {
      main: "#2E7D32",
    },
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',

    h1: {
      fontWeight: 700,
    },

    h2: {
      fontWeight: 700,
    },

    h3: {
      fontWeight: 600,
    },

    h4: {
      fontWeight: 600,
    },

    h5: {
      fontWeight: 600,
    },

    h6: {
      fontWeight: 600,
    },

    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 10,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "9px 18px",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: "medium",
      },
    },
  },
});

export default theme;
