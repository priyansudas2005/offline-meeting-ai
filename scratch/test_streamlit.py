import streamlit as st
try:
    # Test call to st.pills with default value
    val = st.pills("Format", ["Timestamps", "Compact"], default="Timestamps")
    print("Success: st.pills compiled")
except Exception as e:
    print(f"Failed: {e}")
