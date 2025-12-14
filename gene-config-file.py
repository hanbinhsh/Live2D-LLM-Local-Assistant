import json
import os

staticAPIFile = {}

with open('../model_list.json','r',encoding='utf-8') as f:
    model_list = json.load(f)

#def get_model_textures

# 获取材质列表
def get_textures(modelName):
    if(os.path.exists(modelName+'/textures_order.json')):
        with open(modelName+'/textures_order.json','r',encoding='utf-8') as f:
            textures_order = json.load(f)

        # 不会写排列组合！所以这里只好先写死了，期待有大佬帮我改下QAQ
        dir_list = []
        path_list = []
        for tmp1 in textures_order:
            for tmp2 in tmp1:
                dir_list.append(os.listdir(modelName+'/'+tmp2))
                path_list.append(modelName+'/'+tmp2+'/')
        dir_list = [[dir_list[0][x1], dir_list[1][x2], dir_list[2][x2], dir_list[3][x3]] for x1 in range(len(dir_list[0])) for x2 in range(len(dir_list[1])) for x3 in range(len(dir_list[3]))]

        for e in dir_list:
            for i in range(len(path_list)):
                e[i] = 'MODEL_HOME/' + path_list[i] + e[i]

        return dir_list

    else:
        return [['MODEL_HOME/' + modelName+'/textures/' + f] for f in os.listdir(modelName+'/'+'textures')]

# 因为不需要缓存，所以这里没有写 modelTextures.php 中的 get_list()。
def get_name(modelName, id):
    tmp_list = get_textures(modelName)
    return tmp_list[id-1]

def get_all_textures(model_list):
    tmp_list = []
    for e in model_list['models']:
        if(type(e) == str):
            try:
                tmp_list.append(get_textures(e))
            except FileNotFoundError as err:
                tmp_list_3=[]
                with open(e+'/index.json','r',encoding='utf-8') as f:
                    tmp_json = json.load(f)
                    tmp_list_3.append([('MODEL_HOME/' + e + '/' + texture) for texture in tmp_json['textures']])
                tmp_list.append(tmp_list_3)
                
        else: # e is list
            tmp_list_2 = []
            for name in e:
                with open(name+'/index.json','r',encoding='utf-8') as f:
                    tmp_json = json.load(f)
                    tmp_list_2.append([('MODEL_HOME/' + name + '/' + texture) for texture in tmp_json['textures']])
            tmp_list.append(tmp_list_2)
    return tmp_list


# model textuees poes physics motions expressions
def get_all_pattern_json(model_list):
    tmp_dict = {}
    for e in model_list['models']:
        if(type(e) == str):
            with open(e+'/index.json','r',encoding='utf-8') as f:
                tmp_json = json.load(f)
            tmp_json['model'] = 'MODEL_HOME/' + e + '/' + tmp_json['model']
            tmp_json['textures'] = "TEXTURES_REP"
            if 'physics' in tmp_json:
                tmp_json['physics'] = 'MODEL_HOME/' + e + '/' + tmp_json['physics']
            if 'pose' in tmp_json:
                tmp_json['pose'] = 'MODEL_HOME/' + e + '/' + tmp_json['pose']
            if 'motions' in tmp_json:
                motions_str = json.dumps(tmp_json['motions'])
                motions_str = motions_str.replace('sounds/', 'MODEL_HOME/' + e + '/sounds/')
                motions_str = motions_str.replace('motions/', 'MODEL_HOME/' + e + '/motions/')
                tmp_json['motions'] = json.loads(motions_str)
            if 'expressions' in tmp_json:
                expressions_str = json.dumps(tmp_json['expressions'])
                expressions_str = expressions_str.replace('expressions/', 'MODEL_HOME/' + e + '/expressions/')
                tmp_json['expressions'] = json.loads(expressions_str)
            tmp_dict[e]=json.dumps(tmp_json)
        else: # Same as above
            for ee in e:
                with open(ee+'/index.json','r',encoding='utf-8') as f:
                    tmp_json = json.load(f)
                tmp_json['model'] = 'MODEL_HOME/' + ee + '/' + tmp_json['model']
                tmp_json['textures'] = "TEXTURES_REP"
                if 'physics' in tmp_json:
                    tmp_json['physics'] = 'MODEL_HOME/' + ee + '/' + tmp_json['physics']
                if 'pose' in tmp_json:
                    tmp_json['pose'] = 'MODEL_HOME/' + ee + '/' + tmp_json['pose']
                if 'motions' in tmp_json:
                    motions_str = json.dumps(tmp_json['motions'])
                    motions_str = motions_str.replace('sounds/', 'MODEL_HOME/' + ee + '/sounds/')
                    motions_str = motions_str.replace('motions/', 'MODEL_HOME/' + ee + '/motions/')
                    tmp_json['motions'] = json.loads(motions_str)
                if 'expressions' in tmp_json:
                    expressions_str = json.dumps(tmp_json['expressions'])
                    expressions_str = expressions_str.replace('expressions/', 'MODEL_HOME/' + ee + '/expressions/')
                    tmp_json['expressions'] = json.loads(expressions_str)
                tmp_dict[ee]=json.dumps(tmp_json)
    return tmp_dict



staticAPIFile['model_list'] = model_list
staticAPIFile['Textures'] = get_all_textures(model_list)
staticAPIFile['json_pattern'] = get_all_pattern_json(model_list)

with open('static-api-file.json','w',encoding='utf-8') as f:
    json.dump(staticAPIFile, f, ensure_ascii=False)