cmake_minimum_required(VERSION 3.22.1)
project(atrium_llama LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(LLAMA_BUILD_COMMON ON CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TOOLS OFF CACHE BOOL "" FORCE)
set(LLAMA_CURL OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)

add_subdirectory(llama.cpp llama_build)

add_library(atrium_llama SHARED atrium_llama_jni.cpp)

target_include_directories(atrium_llama PRIVATE
    llama.cpp/include
    llama.cpp/ggml/include
    llama.cpp/common
)

target_link_libraries(atrium_llama PRIVATE
    llama
    common
    android
    log
)