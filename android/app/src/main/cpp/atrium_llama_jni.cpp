#include <jni.h>
#include <string>
#include <vector>
#include <atomic>
#include <android/log.h>
#include "llama.h"
#include "common.h"

#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, "AtriumLlama", __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "AtriumLlama", __VA_ARGS__)

static llama_model * g_model = nullptr;
static llama_context * g_ctx = nullptr;
static std::atomic<bool> g_abort{false};

extern "C" JNIEXPORT void JNICALL
Java_io_github_bymiko_atrium_AtriumLocalAiPlugin_nativeInit(JNIEnv *, jobject) {
    llama_backend_init();
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_bymiko_atrium_AtriumLocalAiPlugin_nativeAbort(JNIEnv *, jobject) {
    g_abort.store(true);
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_bymiko_atrium_AtriumLocalAiPlugin_nativeFree(JNIEnv *, jobject) {
    g_abort.store(true);
    if (g_ctx != nullptr) {
        llama_free(g_ctx);
        g_ctx = nullptr;
    }
    if (g_model != nullptr) {
        llama_model_free(g_model);
        g_model = nullptr;
    }
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_github_bymiko_atrium_AtriumLocalAiPlugin_nativeLoadModel(JNIEnv * env, jobject, jstring jpath, jint nCtx) {
    if (g_ctx != nullptr) { llama_free(g_ctx); g_ctx = nullptr; }
    if (g_model != nullptr) { llama_model_free(g_model); g_model = nullptr; }

    const char * path = env->GetStringUTFChars(jpath, nullptr);
    llama_model_params mparams = llama_model_default_params();
    mparams.n_gpu_layers = 0;
    g_model = llama_model_load_from_file(path, mparams);
    env->ReleaseStringUTFChars(jpath, path);

    if (g_model == nullptr) {
        LOGE("Failed to load GGUF model");
        return JNI_FALSE;
    }

    llama_context_params cparams = llama_context_default_params();
    cparams.n_ctx = nCtx > 0 ? nCtx : 2048;
    cparams.n_batch = 512;
    cparams.n_threads = 6;
    cparams.n_threads_batch = 6;

    g_ctx = llama_init_from_model(g_model, cparams);
    if (g_ctx == nullptr) {
        llama_model_free(g_model);
        g_model = nullptr;
        LOGE("Failed to create llama context");
        return JNI_FALSE;
    }
    LOGI("GGUF model loaded successfully");
    return JNI_TRUE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_github_bymiko_atrium_AtriumLocalAiPlugin_nativeGenerate(
    JNIEnv * env,
    jobject thiz,
    jstring jprompt,
    jfloat temp,
    jint maxTokens
) {
    if (g_model == nullptr || g_ctx == nullptr) {
        return env->NewStringUTF("");
    }
    g_abort.store(false);
    llama_kv_cache_clear(g_ctx);

    const char * promptCStr = env->GetStringUTFChars(jprompt, nullptr);
    std::string prompt(promptCStr);
    env->ReleaseStringUTFChars(jprompt, promptCStr);

    const llama_vocab * vocab = llama_model_get_vocab(g_model);
    std::vector<llama_token> tokens(prompt.size() + 32);
    int n_tokens = llama_tokenize(vocab, prompt.c_str(), (int)prompt.size(), tokens.data(), (int)tokens.size(), true, true);
    if (n_tokens < 0) {
        tokens.resize(-n_tokens);
        n_tokens = llama_tokenize(vocab, prompt.c_str(), (int)prompt.size(), tokens.data(), (int)tokens.size(), true, true);
    }
    if (n_tokens <= 0) {
        return env->NewStringUTF("");
    }
    tokens.resize(n_tokens);

    jclass cls = env->GetObjectClass(thiz);
    jmethodID onTokenMid = env->GetMethodID(cls, "onNativeToken", "(Ljava/lang/String;)V");

    llama_batch batch = llama_batch_get_one(tokens.data(), (int)tokens.size());
    if (llama_decode(g_ctx, batch) != 0) {
        return env->NewStringUTF("");
    }

    auto sparams = llama_sampler_chain_default_params();
    llama_sampler * smpl = llama_sampler_chain_init(sparams);
    llama_sampler_chain_add(smpl, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(smpl, llama_sampler_init_top_p(0.92f, 1));
    llama_sampler_chain_add(smpl, llama_sampler_init_temp(temp > 0.0f ? temp : 0.75f));
    llama_sampler_chain_add(smpl, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

    std::string fullResponse;
    int limit = maxTokens > 0 ? maxTokens : 512;
    int n_ctx = (int)llama_n_ctx(g_ctx);

    for (int i = 0; i < limit; ++i) {
        if (g_abort.load()) break;
        if ((int)tokens.size() + i >= n_ctx - 8) break;

        llama_token new_token = llama_sampler_sample(smpl, g_ctx, -1);
        if (llama_vocab_is_eog(vocab, new_token)) break;

        char piece[256];
        int n_piece = llama_token_to_piece(vocab, new_token, piece, sizeof(piece), 0, true);
        if (n_piece > 0) {
            std::string tokStr(piece, n_piece);
            fullResponse += tokStr;
            if (onTokenMid != nullptr) {
                jstring jtok = env->NewStringUTF(tokStr.c_str());
                env->CallVoidMethod(thiz, onTokenMid, jtok);
                env->DeleteLocalRef(jtok);
            }
        }

        batch = llama_batch_get_one(&new_token, 1);
        if (llama_decode(g_ctx, batch) != 0) break;
    }

    llama_sampler_free(smpl);
    return env->NewStringUTF(fullResponse.c_str());
}